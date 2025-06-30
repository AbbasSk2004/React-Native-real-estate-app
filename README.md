# Eskan Real Estate Mobile App

A comprehensive React Native real estate application built with Expo Router for browsing, searching, and managing properties. This app provides a complete real estate experience, including property listings, agent interactions, chat functionality, user profiles, and more.

## Features

### Property Management
- **Property Browsing**: Browse featured, recommended, and trending properties
- **Advanced Search**: Filter properties by type, price range, location, amenities, and more
- **Property Details**: View comprehensive property information including images, descriptions, amenities, and location
- **Save Properties**: Save favorite properties for later viewing
- **Property Listings**: Users can list their own properties for sale or rent
- **Property Inquiries**: Contact property owners or agents directly through the app

### User Experience
- **Multi-tab Navigation**: Home, Explore, Agents, and Profile tabs for easy navigation
- **Dark/Light Mode**: Support for system theme preferences
- **Responsive Design**: Works on various screen sizes and orientations
- **Offline Support**: Basic functionality works without internet connection
- **Push Notifications**: Receive updates about property inquiries, messages, and more

### User Management
- **Authentication**: Complete sign-in, sign-up, and password recovery flows
- **Profile Management**: Edit profile information, upload profile pictures
- **Agent Applications**: Apply to become a verified agent on the platform
- **Verification**: OTP verification for secure account access

### Communication
- **Chat System**: Real-time chat between users, property owners, and agents
- **Notifications**: In-app notification center for updates and messages
- **Contact Forms**: Submit inquiries about properties or general questions

### Payments & Business
- **Payment Methods**: Manage payment methods for transactions
- **FAQ Section**: Comprehensive FAQ section for common questions
- **Terms & Privacy**: Detailed terms of service and privacy policy

## Tech Stack

### Frontend
- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform with pre-built native components
- **Expo Router**: File-based routing system for seamless navigation
- **NativeWind/Tailwind CSS**: Utility-first styling approach
- **React Navigation**: Navigation library integrated with Expo Router

### State Management & Data Handling
- **Context API**: For global state management
- **Async Storage**: For persistent local storage
- **Axios**: For API requests and data fetching

### UI/UX Components
- **Expo Image**: Optimized image handling and caching
- **React Native Reanimated**: For smooth animations and transitions
- **Expo Haptics**: For tactile feedback
- **Vector Icons**: For consistent iconography throughout the app

### Backend Integration
- **RESTful API**: Integration with backend services
- **WebSockets**: For real-time chat and notifications
- **Environment Configuration**: Support for development and production environments

## Project Structure

```
real_estate/
├── app/                      # Application screens (Expo Router)
│   ├── (tabs)/               # Tab navigator screens
│   │   ├── _layout.js        # Tab navigator configuration
│   │   ├── index.js          # Home tab with featured properties
│   │   ├── explore.js        # Property exploration screen
│   │   ├── agents.js         # Agent listings and search
│   │   └── profile.js        # User profile and settings
│   ├── _layout.js            # Root layout with stack navigator
│   ├── sign-in.js            # Authentication screen
│   ├── sign-up.js            # Registration screen
│   ├── forgot-password.js    # Password recovery
│   ├── verify-otp.js         # OTP verification
│   ├── propertyDetails.js    # Property details screen
│   ├── add-property.js       # Add new property listing
│   ├── edit-profile.js       # Edit user profile
│   ├── saved-properties.js   # Saved/favorite properties
│   ├── my-properties.js      # User's property listings
│   ├── chat.js               # Individual chat screen
│   ├── chats.js              # Chat list/inbox
│   ├── notifications.js      # Notification center
│   ├── agent-application.js  # Apply to become an agent
│   ├── payment-methods.js    # Payment method management
│   └── more screens...       # Additional app screens
│
├── components/               # Reusable UI components
│   ├── properties/           # Property-related components
│   │   ├── PropertyCard.js   # Property card component
│   │   ├── PropertyDetailsSection.js # Property details component
│   │   ├── PropertyForm.js   # Property creation/editing form
│   │   └── more...           # Other property components
│   ├── common/               # Common UI components
│   │   ├── Filters.js        # Search filters component
│   │   ├── FavoriteButton.js # Favorite toggle button
│   │   ├── SwipeWrapper.js   # Swipe gesture wrapper
│   │   └── more...           # Other common components
│   └── other components...   # Additional component categories
│
├── services/                 # API and service integrations
│   ├── api.js                # API client setup and base requests
│   ├── auth.js               # Authentication services
│   ├── propertyService.js    # Property-related API calls
│   ├── chat.service.js       # Chat functionality
│   ├── notificationService.js # Notification handling
│   ├── websocket.js          # WebSocket connection management
│   └── more services...      # Additional service modules
│
├── constants/                # App constants
│   ├── colors.js             # Color definitions
│   └── more constants...     # Other constant files
│
├── utils/                    # Utility functions
│   ├── authStorage.js        # Authentication token storage
│   ├── imageUtils.js         # Image handling utilities
│   └── more utilities...     # Other utility modules
│
├── context/                  # React Context providers
│   ├── AuthContext.js        # Authentication context
│   ├── ThemeContext.js       # Theme management
│   └── more contexts...      # Other context providers
│
├── hooks/                    # Custom React hooks
│   └── various hooks...      # App-specific hooks
│
├── assets/                   # Static assets
│   ├── fonts/                # Custom fonts
│   ├── icon.png              # App icon
│   └── splash.png            # Splash screen
│
├── config/                   # Configuration files
│   ├── index.js              # Main configuration
│   └── constants.js          # Configuration constants
│
└── various config files...   # Root configuration files
```

## Installation and Setup

1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Start the development server
```bash
npm start
```
4. Run on device or simulator
   - Press 'a' for Android
   - Press 'i' for iOS
   - Scan QR code with Expo Go app on your device

## Environment Configuration

This app supports both development and production environments:

### Development Environment
- Uses local backend API (default: `http://localhost:3001/api`)
- WebSocket connection to local server
- Run with: `npm run android` or `npm run ios`

### Production Environment
- Uses Render backend API (`https://eskan-real-estate-backend.onrender.com/api`)
- Production WebSocket connection
- Run with: `npm run android:prod` or `npm run ios:prod`
- Build with: `npm run build:android` or `npm run build:ios`

## Building for Production

### Using EAS Build (Recommended)
```bash
# Configure EAS
npx eas build:configure

# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

### Manual Android Build
1. Generate native projects: `npm run prebuild:android`
2. Open Android Studio and build the APK/AAB

## Development Notes

- The app uses environment variables for configuration, stored in `.env` files (not included in repo)
- WebSocket connections are used for real-time chat and notifications
- The app implements deep linking for authentication flows and notifications
- Supabase is used for storage of property images
- The backend API handles authentication, property data, and user management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 