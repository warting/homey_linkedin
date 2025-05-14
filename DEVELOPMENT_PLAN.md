# LinkedIn Homey App Development Plan

This document outlines the development plan for creating a Homey app that integrates with LinkedIn, allowing users to post content as a user, page, or showcase.

## Project Overview

- **App Name**: LinkedIn
- **Description**: A Homey app that enables posting to LinkedIn as a user, page, or showcase.
- **ID**: se.premex.linkedin
- **Author**: Stefan Wärting

## Architecture Overview

The app will follow Homey's recommended architecture:

1. **App Core**: Main application logic and LinkedIn API integration
2. **Drivers**: Device representation for different LinkedIn entities (user, page, showcase)
3. **Flow Cards**: Enabling automation workflows for LinkedIn posting
4. **Capabilities**: Representing the state and abilities of LinkedIn entities

## Development Steps

### 1. Setup & Configuration

- [x] Initialize project using Homey CLI (`homey app create`) - *Already completed*
- [x] Set up TypeScript configuration - *Completed*
- [x] Define app permissions in app.json (required for LinkedIn API access) - *Completed*
- [x] Create necessary assets (icons, images) - *Completed*

### 2. LinkedIn API Integration

- [ ] Implement OAuth2 authentication flow for LinkedIn
- [ ] Create service classes for LinkedIn API communication
- [ ] Implement core posting functionality (text, media, URL sharing)
- [ ] Add error handling and rate limit management

### 3. Driver Development

Create drivers for different LinkedIn entity types using `homey app driver create`:

- [ ] **LinkedIn User Driver**: Represent a personal LinkedIn account
  - Authentication and user profile information
  - Post status updates on behalf of a user

- [ ] **LinkedIn Page Driver**: Represent a LinkedIn company page
  - Page authentication and management
  - Post updates as a company page

- [ ] **LinkedIn Showcase Driver**: Represent a LinkedIn showcase page
  - Showcase page authentication
  - Post updates to showcase pages

### 4. Flow Card Development

Create flow cards using `homey app flow create`:

- [ ] **Action Cards**:
  - Post a text update to LinkedIn
  - Post a URL with preview to LinkedIn
  - Post an image with text to LinkedIn
  - Post a document to LinkedIn
  - Schedule a post for later

- [ ] **Condition Cards**:
  - Check if authenticated to LinkedIn
  - Check posting limits/rate limits

- [ ] **Trigger Cards**:
  - When a LinkedIn post receives engagement
  - When a LinkedIn connection request is received

### 5. Settings & Configuration

- [ ] Create app settings page for global configurations
- [ ] Driver settings for account management
- [ ] Create connection wizards for authentication

### 6. Testing & Validation

- [ ] Unit testing for API integration
- [ ] Flow card testing
- [ ] End-to-end testing with actual LinkedIn accounts
- [ ] Validate app using `homey app validate`

### 7. Documentation & Deployment

- [ ] Create user documentation
- [ ] Update README.md with setup instructions
- [ ] Prepare app for submission to Homey App Store
- [ ] Build and publish app using GitHub workflows

## Technical Implementation Details

### LinkedIn API Integration

The app will use LinkedIn's REST APIs:
- Marketing Developer Platform for company pages
- Sign In With LinkedIn for user authentication
- Share API for posting content

Required OAuth 2.0 scopes:
- r_liteprofile
- r_emailaddress
- w_member_social
- w_organization_social

### Data Models

1. **LinkedIn Post**:
   - Text content
   - Media attachments (images, documents)
   - URLs and link previews
   - Visibility settings

2. **LinkedIn User**:
   - Profile information
   - Connection status
   - Post history

3. **LinkedIn Page/Showcase**:
   - Page information
   - Admin rights
   - Post history

### Key Implementation Notes

1. **Authentication Storage**:
   - Store OAuth tokens securely
   - Implement token refresh mechanism
   - Handle revoked access gracefully

2. **Post Creation**:
   - Support various content types
   - Handle media uploads
   - Provide posting status and feedback

3. **Error Handling**:
   - Network connectivity issues
   - API limits and restrictions
   - Authentication failures

## Instructions for GitHub Copilot Agent

As a GitHub Copilot agent working on this project, follow these guidelines:

1. **Step-by-Step Implementation**:
   - Focus on one component at a time, starting with core LinkedIn API integration
   - Use the Homey CLI to generate required files and structure
   - Follow TypeScript best practices for type safety

2. **API Integration**:
   - Implement a LinkedIn service class that handles authentication and API calls
   - Use OAuth2 for secure authentication with LinkedIn
   - Create methods for each post type (text, image, document, URL)

3. **Driver Development**:
   - Create separate drivers for user accounts, pages, and showcases
   - Implement paired device flows for authentication
   - Store credentials securely and refresh tokens when needed

4. **Flow Card Implementation**:
   - Create action cards for posting different types of content
   - Implement validation and error handling
   - Add user-friendly descriptions and input fields

5. **Testing**:
   - Validate the app regularly using `homey app validate`
   - Test OAuth flows completely
   - Ensure error messages are user-friendly

6. **Code Structure**:
   - Keep API concerns separate from Homey-specific code
   - Create utility functions for common operations
   - Document code with JSDoc comments

7. **Finalization**:
   - Ensure all settings pages are functional
   - Complete translations for all user-facing text
   - Validate the app before submission

## Resources

- [Homey Developer Documentation](https://developer.homey.app/)
- [LinkedIn REST API Documentation](https://developer.linkedin.com/docs)
- [LinkedIn Marketing Developer Platform](https://www.linkedin.com/developers/apps)
- [OAuth 2.0 Documentation](https://oauth.net/2/)

## Timeline

1. Basic setup and LinkedIn API integration (2 days)
2. Driver development (2 days)
3. Flow card implementation (2 days)
4. Testing and refinement (2 days)
5. Documentation and submission (1 day)

Total estimated time: 9 days of development work.


