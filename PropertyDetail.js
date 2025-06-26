import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useGlobalChat } from '../../context/ChatContext';
import { formatPrice } from '../../utils/formatters';
import { storeViewedProperty } from '../../services/recommendation';
import PropertyMap from '../properties/PropertyMap';
import FavoriteButton from '../common/FavoriteButton';
import ShareProperty from '../properties/ShareProperty';
import PropertyImageGallery from '../properties/PropertyImageGallery';
import PropertyInquiryForm from '../properties/PropertyInquiryForm';
import './PropertyDetail.css';
import { propertyService } from '../../services/propertyService';
import { endpoints } from '../../services/api';
import { chatService } from '../../services/chat.service';
import { getImageUrl } from '../../utils/imageUtils';

// Lazy load components that are not immediately needed
const SimilarProperties = React.lazy(() => import('../properties/SimilarProperties'));

// Cache key generator for property data
const getPropertyCacheKey = (id) => `property_${id}`;

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { 
    startNewConversation, 
    setActiveConversation,
    setActiveConversationId,
    setShowChat
  } = useGlobalChat();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewCount, setViewCount] = useState(0);
  const [loadingViews, setLoadingViews] = useState(false);
  const [viewError, setViewError] = useState(null);
  const viewRecorded = useRef(false);
  const abortController = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const isMounted = useRef(true);
  const propertyCache = useRef(new Map());

  // Debounce view count updates
  const debounceTimeout = useRef(null);
  const lastViewUpdate = useRef(0);
  const MIN_VIEW_UPDATE_INTERVAL = 5000; // 5 seconds

  // Memoize property data for child components
  const memoizedPropertyData = useMemo(() => {
    if (!property) return null;
    return {
      id: property.id,
      propertyType: property.property_type,
      city: property.city,
      price: property.price,
      profiles: property.profiles
    };
  }, [property]);

  // Memoize the view count handler with debouncing and caching
  const handleViewCount = useCallback(async () => {
    if (viewRecorded.current || !id || !isMounted.current) return;
    
    const now = Date.now();
    if (now - lastViewUpdate.current < MIN_VIEW_UPDATE_INTERVAL) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        handleViewCount();
      }, MIN_VIEW_UPDATE_INTERVAL);
      return;
    }
    
    lastViewUpdate.current = now;
    
    try {
      setLoadingViews(true);
      setViewError(null);
      
      // First get current view count
      const currentCount = await endpoints.propertyViews.getViewCount(id);
      
      // Then record the view
      const viewResponse = await endpoints.propertyViews.recordView(id);
      
      if (!isMounted.current) return;

      if (viewResponse?.success) {
        // Use the updated count from the response, fallback to current count + 1
        setViewCount(viewResponse.data?.count || (currentCount + 1));
        viewRecorded.current = true;
      } else {
        // If recording failed, at least show the current count
        setViewCount(currentCount);
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('View count error:', err);
      setViewError(err.message || 'Could not update view count');
      
      // Try to at least get and show the current count
      try {
        const count = await endpoints.propertyViews.getViewCount(id);
        setViewCount(count);
      } catch (countErr) {
        console.error('Failed to get view count:', countErr);
      }
    } finally {
      if (isMounted.current) {
        setLoadingViews(false);
      }
    }
  }, [id]);

  // Fetch property data with caching
  const fetchPropertyData = useCallback(async () => {
    if (!id || !isMounted.current) return;

    const cacheKey = getPropertyCacheKey(id);
    const cachedData = propertyCache.current.get(cacheKey);
    
    if (cachedData) {
      setProperty(cachedData);
      setError(null);
      setLoading(false);
      // Store in local storage for recommendations
      storeViewedProperty(cachedData);
      // Get initial view count
      try {
        const count = await endpoints.propertyViews.getViewCount(id);
        setViewCount(count);
      } catch (err) {
        console.error('Error getting initial view count:', err);
      }
      // Still update view count for cached data
      handleViewCount();
      return;
    }

    try {
      abortController.current = new AbortController();
      
      const data = await propertyService.getPropertyById(id, {
        signal: abortController.current.signal
      });
      
      if (!isMounted.current) return;
      
      // Cache the property data
      propertyCache.current.set(cacheKey, data);
      
      setProperty(data);
      setError(null);
      
      // Store in local storage for recommendations
      storeViewedProperty(data);
      
      // Get initial view count
      try {
        const count = await endpoints.propertyViews.getViewCount(id);
        setViewCount(count);
      } catch (err) {
        console.error('Error getting initial view count:', err);
      }
      
      // Delay view count recording with a minimum interval
      setTimeout(() => {
        if (isMounted.current) {
          handleViewCount();
        }
      }, MIN_VIEW_UPDATE_INTERVAL);
    } catch (err) {
      if (!isMounted.current) return;
      if (err.name === 'AbortError') return;
      
      console.error('Error fetching property:', err);
      setError(err.message || 'Failed to load property details');
      toast.error('Failed to load property details');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id, toast, handleViewCount]);

  useEffect(() => {
    isMounted.current = true;
    
    fetchPropertyData();

    return () => {
      isMounted.current = false;
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
      endpoints.propertyViews.clearCache(id);
    };
  }, [id, fetchPropertyData]);

  // Memoize the chat handler
  const handleStartChat = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to send messages');
      navigate('/sign-in', { state: { from: window.location.pathname } });
      return;
    }

    if (!property?.profiles?.profiles_id) {
      toast.error('Cannot start chat: Owner information is missing');
      return;
    }

    // Prevent starting chat with yourself
    if (property.profiles.profiles_id === user.id) {
      toast.error('You cannot start a chat with yourself');
      return;
    }

    try {
      // First check if conversation exists
      const existingConversations = await chatService.fetchConversations();
      const existingConversation = existingConversations?.find(conv => 
        (conv.participant1_id === user.id && conv.participant2_id === property.profiles.profiles_id) ||
        (conv.participant1_id === property.profiles.profiles_id && conv.participant2_id === user.id)
      );

      if (existingConversation) {
        setActiveConversation(existingConversation);
        setActiveConversationId(existingConversation.id);
        setShowChat(true);
        return;
      }

      // If no existing conversation, create new one
      const conversation = await startNewConversation(
        property.profiles.profiles_id,
        property.id
      );

      if (conversation) {
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to start conversation. Please try again.';
      toast.error(errorMessage);
    }
  }, [user, property, navigate, startNewConversation, setActiveConversation, setActiveConversationId, setShowChat, toast]);

  // Function to handle redirect to login for inquiry button
  const handleInquiryClick = () => {
    if (!user) {
      toast.info('Please sign in to send an inquiry');
      navigate('/sign-in', { state: { from: window.location.pathname } });
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="error-state py-5">
              <i className="fa fa-exclamation-triangle fa-4x text-warning mb-4"></i>
              <h3 className="fw-bold mb-3">Property Not Found</h3>
              <p className="text-muted mb-4 lead">
                {error || 'The property you are looking for does not exist or has been removed.'}
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <Link to="/properties" className="btn btn-primary">
                  <i className="fa fa-search me-2"></i>
                  Browse Properties
                </Link>
                <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
                  <i className="fa fa-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail-page bg-light">
      {property && (
        <>
          <PropertyImageGallery 
            mainImage={getImageUrl(property.main_image)}
            images={property.images ? property.images.map(img => getImageUrl(img)) : []} 
          />
          
          <div className="container py-4">
            <div className="row g-4">
              {/* Main Content */}
              <div className="col-lg-8">
                {/* Property Header */}
                <div className="property-header bg-white rounded-3 shadow-sm p-4 mb-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <div className="badge-container">
                        <div className="property-badge">
                          <span className={`badge ${property.status === 'For Sale' ? 'bg-success' : 'bg-primary'} px-3 py-2`}>
                            {property.status}
                          </span>
                        </div>
                        <div className="property-badge">
                          <span className="badge bg-light text-dark px-3 py-2">
                            <i className="fas fa-eye me-1"></i>
                            {loadingViews ? (
                              <small className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading view count...</span>
                              </small>
                            ) : viewError ? (
                              <span title={viewError}>--</span>
                            ) : (
                              <>{viewCount} views</>
                            )}
                          </span>
                        </div>
                        <div className="property-badge">
                          <span className="badge bg-light text-dark px-3 py-2">
                            <i className="fas fa-clock me-1"></i>
                            {new Date(property.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <h1 className="h2 fw-bold mb-2 text-dark">{property.title}</h1>
                      
                      <div className="location-info d-flex align-items-center text-muted mb-3">
                        <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                        <span>
                          {property.address && `${property.address}, `}
                          {property.village && `${property.village}, `}
                          {property.city && `${property.city}, `}
                          {property.governate}
                        </span>
                      </div>

                      <div className="price-section">
                        <h2 className="h3 text-primary fw-bold mb-0">
                          {formatPrice(property.price)}
                          {property.status === 'For Rent' && <span className="fs-6 text-muted">/month</span>}
                        </h2>
                      </div>
                    </div>
                    
                    <div className="action-buttons d-flex gap-2">
                      {memoizedPropertyData && (
                        <>
                          <FavoriteButton propertyId={memoizedPropertyData.id} />
                          <ShareProperty property={memoizedPropertyData} className="btn-outline-primary" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Key Details */}
                  <div className="key-details-grid mb-3">
                    <div className="row g-2">
                      {/* Property Type Badge */}
                      {property.property_type && (
                        <div className="col-12 d-flex justify-content-center mb-2">
                          <div className="detail-item d-inline-flex align-items-center px-3 py-2 bg-light text-dark rounded-2" style={{ maxWidth: 'fit-content' }}>
                            <i className={`fas ${
                              property.property_type === 'Office' ? 'fa-briefcase' :
                              property.property_type === 'Retail' ? 'fa-shopping-cart' :
                              property.property_type === 'Land' ? 'fa-mountain' :
                              property.property_type === 'Farm' ? 'fa-tractor' :
                              'fa-home'
                            } fa-lg text-primary me-2`}></i>
                            <div>
                              <span className="fw-bold">{property.property_type}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Areas */}
                      {property.area && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-ruler-combined fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.area} m²</div>
                              <small className="text-muted">Built Area</small>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {property.garden_area && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-tree fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.garden_area} m²</div>
                              <small className="text-muted">Garden Area</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rooms */}
                      {property.bedrooms && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-bed fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.bedrooms}</div>
                              <small className="text-muted">Bedrooms</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {property.bathrooms && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-bath fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.bathrooms}</div>
                              <small className="text-muted">Bathrooms</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {property.livingrooms && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-couch fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.livingrooms}</div>
                              <small className="text-muted">Living Rooms</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Building Details */}
                      {property.floor && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-building fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.floor}</div>
                              <small className="text-muted">Floor</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {property.year_built && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-calendar-alt fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.year_built}</div>
                              <small className="text-muted">Year Built</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Parking */}
                      {property.parking_spaces && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-car fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.parking_spaces}</div>
                              <small className="text-muted">Parking Spaces</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Property Status */}
                      {property.furnishing_status && (
                        <div className="col-6 col-md-3">
                          <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                            <i className="fas fa-chair fa-lg text-primary me-2"></i>
                            <div>
                              <div className="fw-bold">{property.furnishing_status}</div>
                              <small className="text-muted">Furnishing</small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Office-specific details */}
                      {property.property_type === 'Office' && (
                        <>
                          {property.meeting_rooms && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-users fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.meeting_rooms}</div>
                                  <small className="text-muted">Meeting Rooms</small>
                                </div>
                              </div>
                            </div>
                          )}
                          {property.parking_spaces && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-parking fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.parking_spaces}</div>
                                  <small className="text-muted">Parking Spaces</small>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Retail-specific details */}
                      {property.property_type === 'Retail' && (
                        <>
                          {property.frontage && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-store-alt fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.frontage} m</div>
                                  <small className="text-muted">Shop Front</small>
                                </div>
                              </div>
                            </div>
                          )}
                          {property.storage_area && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-warehouse fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.storage_area} m²</div>
                                  <small className="text-muted">Storage Area</small>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Land-specific details */}
                      {property.property_type === 'Land' && (
                        <>
                          {property.land_type && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-map fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.land_type}</div>
                                  <small className="text-muted">Land Type</small>
                                </div>
                              </div>
                            </div>
                          )}
                          {property.zoning && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-clipboard-list fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.zoning}</div>
                                  <small className="text-muted">Zoning</small>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Farm-specific details */}
                      {property.property_type === 'Farm' && (
                        <>
                          {property.water_source && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-water fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.water_source}</div>
                                  <small className="text-muted">Water Source</small>
                                </div>
                              </div>
                            </div>
                          )}
                          {property.crop_types && (
                            <div className="col-6 col-md-3">
                              <div className="detail-item d-flex align-items-center p-2 bg-light rounded-2">
                                <i className="fas fa-seedling fa-lg text-primary me-2"></i>
                                <div>
                                  <div className="fw-bold">{property.crop_types}</div>
                                  <small className="text-muted">Crop Types</small>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Description */}
                <div className="property-description bg-white rounded-3 shadow-sm p-4 mb-4">
                  <h3 className="h4 fw-bold mb-3">
                    <i className="fas fa-align-left me-2 text-primary"></i>
                    Description
                  </h3>
                  <div className="description-content">
                    <p className="text-muted lh-lg">{property.description}</p>
                  </div>
                </div>

                {/* Property Features */}
                {property.features && Object.keys(property.features).length > 0 && (
                  <div className="property-features bg-white rounded-3 shadow-sm p-4 mb-4">
                    <h3 className="h4 fw-bold mb-3">
                      <i className="fas fa-star me-2 text-primary"></i>
                      Features & Amenities
                    </h3>
                    <div className="features-grid">
                      <div className="row g-3">
                        {Object.entries(property.features).map(([key, value]) => (
                          value && (
                            <div key={key} className="col-md-6 col-lg-4">
                              <div className="feature-item d-flex align-items-center p-2 rounded-2 bg-light">
                                <div className="feature-icon me-3">
                                  <i className="fas fa-check-circle text-success"></i>
                                </div>
                                <span className="feature-text">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Map */}
                <div className="property-location bg-white rounded-3 shadow-sm p-4 mb-4">
                  <PropertyMap 
                    locationUrl={property.location_url}
                    address={property.address}
                    city={property.city}
                    governate={property.governate}
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-lg-4">
                {/* Contact Owner Card */}
                <div className="contact-owner-card bg-white rounded-3 shadow-sm p-4 mb-4">
                  <div className="agent-header text-center mb-4">
                    <div className="agent-avatar mb-3">
                      <img
                        src={property.profiles.profile_photo || '/img/default-avatar.png'}
                        alt={`${property.profiles.firstname} ${property.profiles.lastname}`}
                        className="rounded-circle border border-3 border-primary"
                        width="80"
                        height="80"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <h4 className="h5 fw-bold mb-1">
                      {property.profiles.firstname} {property.profiles.lastname}
                    </h4>
                    <p className="text-muted small mb-0">
                      <i className="fas fa-user-tie me-1"></i>
                      {property.profiles.role || 'Property Owner'}
                    </p>
                  </div>

                  <div className="contact-actions d-grid gap-2">
                    <a
                      href={`https://wa.me/${property.profiles.phone}`}
                      className="btn btn-success btn-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fab fa-whatsapp me-2"></i>
                      WhatsApp
                    </a>
                    
                    <button
                      onClick={handleStartChat}
                      className="btn btn-primary btn-lg"
                    >
                      <i className="fas fa-comments me-2"></i>
                      Send Message
                    </button>
                    
                    <a
                      href={`tel:${property.profiles.phone}`}
                      className="btn btn-outline-primary btn-lg"
                    >
                      <i className="fas fa-phone me-2"></i>
                      Call Now
                    </a>
                    
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      data-bs-toggle={user ? "collapse" : ""}
                      data-bs-target={user ? "#inquiryFormCollapse" : ""}
                      aria-expanded="false"
                      aria-controls="inquiryFormCollapse"
                      onClick={!user ? handleInquiryClick : undefined}
                    >
                      <i className="fas fa-envelope me-2"></i>
                      Inquiry
                    </button>
                  </div>
                  <div className="collapse mt-3" id="inquiryFormCollapse">
                    <PropertyInquiryForm propertyId={property.id} />
                  </div>
                </div>
              </div>

              {/* Similar Properties Section */}
              {memoizedPropertyData && (
                <Suspense fallback={
                  <div className="similar-properties-section bg-white rounded-3 shadow-sm p-4">
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading similar properties...</span>
                      </div>
                    </div>
                  </div>
                }>
                  <div className="similar-properties-section bg-white rounded-3 shadow-sm p-4">
                    <SimilarProperties
                      currentPropertyId={memoizedPropertyData.id}
                      propertyType={memoizedPropertyData.propertyType}
                      city={memoizedPropertyData.city}
                      price={memoizedPropertyData.price}
                    />
                  </div>
                </Suspense>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PropertyDetail);
