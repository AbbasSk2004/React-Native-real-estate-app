// Page utility functions

export const setMetaDescription = (description) => {
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
};

export const setPageTitle = (title) => {
  document.title = title ? `${title} | Real Estate` : 'Real Estate';
};

export const getPageBreadcrumbs = (page) => {
  const breadcrumbs = [
    { label: 'Home', path: '/' }
  ];

  switch (page) {
    case 'cookies':
      breadcrumbs.push({ label: 'Cookie Policy', path: '/cookie-page' });
      break;
    case 'privacy':
      breadcrumbs.push({ label: 'Privacy Policy', path: '/privacy-page' });
      break;
    case 'terms':
      breadcrumbs.push({ label: 'Terms & Conditions', path: '/terms-page' });
      break;
    case 'help':
      breadcrumbs.push({ label: 'Help & Support', path: '/help' });
      break;
    case 'properties':
      breadcrumbs.push({ label: 'Properties', path: '/properties' });
      break;
    case 'favorites':
      breadcrumbs.push({ label: 'Favorites', path: '/favorites' });
      break;
    case 'profile':
      breadcrumbs.push({ label: 'Profile', path: '/profile' });
      break;
    case 'settings':
      breadcrumbs.push({ label: 'Settings', path: '/settings' });
      break;
    default:
      break;
  }

  return breadcrumbs;
};