# 🤝 Contributing to Simpaskor Platform

First off, thank you for considering contributing to Simpaskor Platform! It's people like you that make this platform great for the Indonesian competition community.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Process](#-development-process)
- [Pull Request Process](#-pull-request-process)
- [Coding Standards](#-coding-standards)
- [Testing Guidelines](#-testing-guidelines)
- [Documentation](#-documentation)
- [Issue Reporting](#-issue-reporting)
- [Community](#-community)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge
- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **Docker** & **Docker Compose**
- **Git**
- **PostgreSQL** knowledge (helpful)
- **TypeScript** familiarity

### Development Setup

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/simpaskor-platform.git
   cd simpaskor-platform
   ```

2. **Set Up Development Environment**
   ```bash
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   
   # Set up environment variables
   cp backend/.env.example backend/.env
   # Edit backend/.env with your settings
   ```

3. **Start Development Servers**
   ```bash
   # Option 1: Using Docker (Recommended)
   docker-compose up -d
   
   # Option 2: Manual setup
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

4. **Verify Setup**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/health
   - Login with test credentials from README.md

## 🔄 Development Process

### Branching Strategy
We use **GitFlow** with the following branches:

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/feature-name`** - Feature development
- **`bugfix/bug-description`** - Bug fixes
- **`hotfix/critical-fix`** - Critical production fixes

### Workflow
1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop & Test**
   ```bash
   # Make your changes
   npm test  # Run tests
   npm run lint  # Check code style
   ```

3. **Commit Changes**
   ```bash
   # Follow conventional commits
   git add .
   git commit -m "feat: add user role management"
   ```

4. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR via GitHub interface
   ```

## 📝 Pull Request Process

### Before Submitting
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Self-review completed
- [ ] Related issues linked

### PR Requirements
1. **Clear Description**
   - What changes were made?
   - Why were they necessary?
   - How were they tested?

2. **Small, Focused Changes**
   - One feature per PR
   - Less than 500 lines when possible
   - Single responsibility

3. **Testing Evidence**
   - Screenshots for UI changes
   - Test results
   - Manual testing description

### Review Process
1. **Automated Checks**
   - GitHub Actions CI/CD
   - Code quality checks
   - Security scans

2. **Human Review**
   - Code logic and implementation
   - Architecture decisions
   - Performance impact
   - Security considerations

3. **Approval & Merge**
   - 2 approved reviews required
   - All checks passing
   - Up-to-date with target branch

## 💻 Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good - Clear interfaces and types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ✅ Good - Descriptive function names
const validateUserCredentials = async (
  email: string, 
  password: string
): Promise<ValidationResult> => {
  // Implementation
};

// ❌ Bad - Unclear types and names
const doStuff = (data: any): any => {
  // Implementation
};
```

### React Component Guidelines

```tsx
// ✅ Good - Clear component structure
interface DashboardProps {
  userRole: UserRole;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  userRole, 
  onLogout 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Component content */}
    </div>
  );
};

// ❌ Bad - Unclear props and structure
export const Dashboard = (props: any) => {
  // Implementation
};
```

### API Design Guidelines

```typescript
// ✅ Good - RESTful endpoints
GET    /api/users           // Get all users
GET    /api/users/:id       // Get specific user
POST   /api/users           // Create user
PUT    /api/users/:id       // Update user
DELETE /api/users/:id       // Delete user

// ✅ Good - Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ❌ Bad - Inconsistent endpoints
GET /api/getAllUsers
POST /api/createNewUser
PUT /api/updateUserById/:id
```

### Database Guidelines

```sql
-- ✅ Good - Clear naming and constraints
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'PESERTA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ✅ Good - Proper indexing
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## 🧪 Testing Guidelines

### Testing Strategy
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows

### Frontend Testing
```typescript
// ✅ Good - Comprehensive component test
describe('UserDashboard', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    role: 'PESERTA' as UserRole
  };

  it('should render user information correctly', () => {
    render(<UserDashboard user={mockUser} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('PESERTA')).toBeInTheDocument();
  });

  it('should handle logout when button clicked', async () => {
    const mockLogout = jest.fn();
    render(<UserDashboard user={mockUser} onLogout={mockLogout} />);
    
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
```

### Backend Testing
```typescript
// ✅ Good - API endpoint test
describe('POST /api/auth/login', () => {
  it('should return token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('should return error for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

### Running Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📚 Documentation

### Code Documentation
```typescript
/**
 * Validates user credentials and returns authentication result
 * 
 * @param email - User's email address
 * @param password - User's password (plain text)
 * @returns Promise resolving to authentication result with token
 * @throws {ValidationError} When email format is invalid
 * @throws {AuthenticationError} When credentials are incorrect
 * 
 * @example
 * ```typescript
 * const result = await validateCredentials('user@example.com', 'password123');
 * if (result.success) {
 *   console.log('Token:', result.token);
 * }
 * ```
 */
export const validateCredentials = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  // Implementation
};
```

### API Documentation
Update OpenAPI/Swagger documentation for any API changes:

```yaml
# openapi.yml
paths:
  /api/users:
    get:
      summary: Get all users
      description: Retrieves a list of all users (admin only)
      security:
        - bearerAuth: []
      responses:
        200:
          description: List of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
```

## 🐛 Issue Reporting

### Bug Reports
Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- **Clear Description**: What went wrong?
- **Reproduction Steps**: How to reproduce the issue
- **Expected vs Actual**: What should happen vs what happened
- **Environment**: OS, browser, versions
- **Screenshots**: Visual evidence if applicable

### Feature Requests
Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: Your suggested approach
- **Alternatives**: Other solutions considered
- **Acceptance Criteria**: Definition of done

## 🌟 Recognition

### Contributors Wall
Amazing contributors will be featured in our README.md!

### Contribution Types
We recognize all types of contributions:
- 💻 Code
- 📖 Documentation
- 🐛 Bug reports
- 💡 Ideas
- 🎨 Design
- 💬 Community support
- 🔍 Testing

## 📞 Community

### Getting Help
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (coming soon)
- **Email**: support@simpaskor.com for direct support

### Communication Guidelines
- Be respectful and constructive
- Search existing issues before creating new ones
- Use appropriate channels for different types of communication
- Provide context and details in your questions

## 🎯 Development Priorities

### Current Focus Areas
1. **Performance Optimization**
   - Database query optimization
   - Frontend bundle size reduction
   - API response time improvements

2. **User Experience**
   - Mobile responsiveness
   - Accessibility improvements
   - Intuitive navigation

3. **Testing Coverage**
   - Increase unit test coverage to 90%+
   - Add integration tests
   - Implement E2E testing

### Future Roadmap
- Real-time notifications
- Mobile applications
- Advanced analytics
- Multi-language support

---

## 💝 Thank You!

Every contribution, no matter how small, makes a difference. Thank you for helping make Simpaskor Platform better for the Indonesian competition community!

**Happy Coding! 🚀**