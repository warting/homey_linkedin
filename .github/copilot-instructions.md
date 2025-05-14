# LinkedIn Homey App Development Instructions

This file provides instructions for GitHub Copilot when developing the LinkedIn Homey App. These instructions should be followed when implementing features, making code changes, and designing components.

## Project Overview

This is a Homey app that integrates with LinkedIn, allowing users to post content as a user, page, or showcase. The app provides flow actions for automating LinkedIn interactions through the Homey platform.

## Development Process

### Using Homey CLI

- **ALWAYS** use the Homey CLI for creating boilerplate code and components
- Use `homey app driver create` to create new drivers
- Use `homey app flow create` to create new flow cards (actions, conditions, triggers)
- Use `homey app validate` to validate the app structure and configuration
- Use `homey app run` for local testing
- Use other Homey CLI commands as appropriate for each development task

### Development Workflow

1. Use the CLI to generate the appropriate boilerplate
2. Extend the generated code with your implementation
3. Validate changes regularly with `homey app validate`
4. Test functionality with `homey app run`

## Coding Standards

### General

- Use TypeScript for all code with strict typing
- Follow the official Homey App development guidelines
- Ensure all code is well-documented with JSDoc comments
- Follow a functional programming approach where possible
- Use descriptive variable and function names
- Keep functions small and focused (single responsibility)
- Use async/await for all asynchronous code
- Add proper error handling throughout the app

### TypeScript

- Use strict mode and enforce all type checking
- Define interfaces for all data structures
- Use type guards where needed
- Use optional chaining and nullish coalescing operators for safer code
- Prefer readonly properties for immutable data

### File Structure

- Keep the Homey app structure as defined by the CLI
- Place API service classes in a `/lib` directory
- Create utility functions in a `/utils` directory
- Use the `.homeycompose` directory for Homey component definitions

## LinkedIn API Integration

### Authentication

- Implement OAuth2 authentication flow for LinkedIn
- Store tokens securely using Homey's Storage API
- Implement proper token refresh logic
- Handle authentication failures gracefully

### API Calls

- Create separate service classes for different API domains
- Use proper rate limiting and error handling
- Follow LinkedIn API best practices
- Implement robust retry logic for API calls

## Driver Implementation

### General Driver Guidelines

- Create separate drivers for each LinkedIn entity type (user, page, showcase)
- Follow Homey's pairing wizard best practices
- Implement capability updates on a regular interval
- Use proper lifecycle methods (init, added, deleted, etc.)

### LinkedIn User Driver

- Implement OAuth2 authentication during pairing
- Store user profile information
- Update capabilities periodically with user status
- Add methods for posting as a user

### LinkedIn Page/Showcase Driver

- Implement page/showcase selection during pairing
- Add methods for posting as a page or showcase
- Update page metrics periodically
- Handle page management permissions

## Flow Card Implementation

### Action Cards

- Create cards with clear titles and descriptions
- Validate all input fields
- Provide helpful error messages
- Support advanced posting options
- Implement proper response handling

### Condition Cards

- Create clear and simple condition checks
- Optimize for performance
- Provide user-friendly descriptions

### Trigger Cards

- Implement polling or webhook mechanisms
- Handle state management properly
- Add debounce mechanisms where appropriate

## Security & Privacy

- Never store sensitive information in plaintext
- Use Homey's secure Storage API for tokens
- Implement token refresh securely
- Request minimal LinkedIn permissions
- Add proper validation for all inputs
- Keep logs clean of sensitive information

## Testing

- Write unit tests for core functionality
- Test OAuth flow thoroughly
- Test all flow cards with different inputs
- Validate the app using `homey app validate` before any submission

## Documentation

- Ensure all public methods have JSDoc comments
- Document configuration options
- Add user-friendly descriptions for all flow cards
- Include setup instructions in README

## Error Handling

- Provide user-friendly error messages
- Log detailed error information for debugging
- Handle network issues gracefully
- Implement proper fallback strategies

## Performance Considerations

- Minimize API calls to LinkedIn
- Cache responses where appropriate
- Use rate limiting to prevent API throttling
- Optimize expensive operations

## Implementation Order

1. Core API integration with LinkedIn
2. Driver implementations with authentication
3. Basic flow actions for posting
4. Additional flow cards and conditions
5. Error handling and robustness improvements
6. Testing and documentation

## Reference Implementation Examples

When implementing OAuth2 authentication, follow this pattern:

```typescript
// OAuth2 Client implementation
class LinkedInOAuth2Client {
  private clientId: string;
  private clientSecret: string;
  private redirectUrl: string;
  private tokenStore: any;
  
  constructor(options: { clientId: string; clientSecret: string; redirectUrl: string }) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUrl = options.redirectUrl;
  }
  
  getAuthorizationUrl(): string {
    // Generate and return LinkedIn authorization URL
  }
  
  async getTokenFromCode(code: string): Promise<OAuthToken> {
    // Exchange authorization code for access token
  }
  
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    // Use refresh token to get new access token
  }
}
```

When implementing a driver, follow this pattern:

```typescript
import Homey from 'homey';

class LinkedInUserDriver extends Homey.Driver {
  async onInit() {
    // Initialize the driver
    this.log('LinkedIn User driver initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }
  
  async onPair(session: any) {
    // Implement the pairing process
    session.setHandler('login', async () => {
      // Handle OAuth login
    });
    
    session.setHandler('list_devices', async () => {
      // Return devices that can be added
    });
  }
  
  private registerFlowCards() {
    // Register action, condition, and trigger cards
  }
}

module.exports = LinkedInUserDriver;
```

When implementing flow cards, follow this pattern:

```typescript
// In the driver class
private registerFlowCards() {
  const postUpdateCard = this.homey.flow.getActionCard('post_update');
  postUpdateCard.registerRunListener(async (args, state) => {
    const { device, message } = args;
    return device.postUpdate(message);
  });
}
```

## Remember

- Always validate app using the Homey CLI before submitting changes
- Keep dependencies minimal and from trusted sources
- Follow Homey's guidelines for app publishing
- Ensure backward compatibility when making changes
