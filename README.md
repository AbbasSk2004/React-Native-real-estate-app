# Real Estate Mobile App

A React Native application built with Expo Router for browsing real estate properties, scheduling appointments, and managing user profiles.

## Features

- **Property Browsing**: View featured properties, search for properties, and filter by various criteria
- **Property Details**: View detailed information about properties including images, descriptions, and amenities
- **User Authentication**: Sign in and sign up functionality
- **User Profile**: View and edit user profile information
- **Appointment Management**: Schedule, view, and manage property viewing appointments

## Tech Stack

- **React Native**: Mobile application framework
- **Expo**: Development platform for React Native
- **Expo Router**: File-based routing system for Expo applications
- **React Navigation**: Navigation library integrated with Expo Router
- **NativeWind/Tailwind CSS**: Styling utilities

## Project Structure

```
real_estate/
├── app/                  # Application screens
│   ├── (tabs)/           # Tab navigator screens
│   │   ├── _layout.js    # Tab navigator configuration
│   │   ├── index.js      # Home tab
│   │   ├── featured.js   # Featured properties tab
│   │   ├── search.js     # Search tab
│   │   └── profile.js    # Profile tab
│   ├── _layout.js        # Root layout with stack navigator
│   ├── index.js          # Entry point that redirects to tabs
│   ├── sign-in.js        # Authentication screen
│   ├── propertyDetails.js # Property details screen
│   └── appointments.js   # Appointments management screen
├── components/           # Reusable UI components
│   ├── PropertyCard.js   # Property card component
│   ├── Filters.js        # Search filters component
│   ├── NoResult.js       # Empty state component
│   ├── Cards.js          # Card components
│   └── SearchBar.js      # Search input component
├── constants/            # App constants
│   ├── colors.js         # Color definitions
│   ├── data.js           # Sample data
│   ├── icons.js          # Icon definitions
│   └── images.js         # Image references
└── assets/               # Static assets (images, fonts, etc.)
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

## Navigation Structure

The app uses Expo Router for navigation, with the following structure:

- **/** - Root route that redirects to tabs
- **/(tabs)/** - Tab navigator containing main screens
  - **/index** - Home screen showing featured and recommended properties
  - **/featured** - Featured properties screen
  - **/search** - Property search screen with filters
  - **/profile** - User profile and settings
- **/sign-in** - Authentication screen
- **/propertyDetails** - Property details screen (accepts id parameter)
- **/appointments** - Appointments management screen

## Development Notes

- The app uses a combination of StyleSheet for styling
- Sample data is used for demonstration purposes and can be replaced with API calls in production
- The app follows expo-router conventions for file-based routing

## Missing Assets

The app references several image assets that need to be added to the assets directory. Check the `assets/placeholder-readme.txt` file for details about the required images.

## Dependencies

- Expo Router - For app navigation
- NativeWind - For styling using Tailwind CSS
- Expo Image - For optimized image handling
- React Native Reanimated - For animations
- Expo Haptics - For haptic feedback
- And other packages listed in package.json

## License

This project is licensed under the MIT License.

## Environment Configuration

This app supports both development and production environments:

- **Development**: Uses the local backend at `http://localhost:3001/api`
- **Production**: Uses the Render backend at `https://eskan-real-estate-backend.onrender.com/api`

### Running in Different Environments

Use these commands to run the app in different environments:

- **Development (Local Backend)**:
  ```
  npm run android
  ```

- **Production (Render Backend)**:
  ```
  npm run android:prod
  ```

## Android Studio Setup

To run the app in Android Studio:

1. Make sure you have the Android development environment set up:
   ```
   npm install
   ```

2. Generate the Android project files:
   ```
   npm run prebuild:android
   ```

3. Open Android Studio and select "Open an existing Android Studio project"

4. Navigate to your project's `android` folder and open it

5. Connect a device or start an emulator

6. Click the "Run" button in Android Studio

### Building a Release APK

To build a release APK that uses the production (Render) backend:

1. In Android Studio, select Build → Generate Signed Bundle / APK
2. Choose APK
3. Fill in your keystore information (create a new one if needed)
4. Select release build variant
5. Click Finish

The APK will be built with the production configuration pointing to your Render backend. 