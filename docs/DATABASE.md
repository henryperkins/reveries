# Database Integration Guide

Reveries now supports persistent storage using PostgreSQL, with automatic fallback to localStorage. This enhances the user experience by preserving research sessions, graph data, and user preferences across browser sessions.

## Quick Start

### Option 1: Azure PostgreSQL Flexible Server (Recommended for Production)

1. **Set up environment variables:**
   ```bash
   export PGHOST=reveriesdb.postgres.database.azure.com
   export PGUSER=hperkins
   export PGPORT=5432
   export PGDATABASE=reveries
   export PGPASSWORD="your-actual-password"
   ```

2. **Test the connection:**
   ```bash
   npm run db:test
   ```

3. **Initialize the database schema:**
   ```bash
   npm run db:init
   ```

4. **Configure the application:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Azure PostgreSQL credentials
   ```

5. **Start the application:**
   ```bash
   npm run dev
   ```

### Option 2: Local Docker PostgreSQL (Development)

1. **Start the local database:**
   ```bash
   npm run db:start
   ```

2. **Set up local environment:**
   ```bash
   export PGHOST=localhost
   export PGUSER=reveries_user
   export PGPORT=5432
   export PGDATABASE=reveries_db
   export PGPASSWORD=reveries_password
   ```

3. **Initialize the database:**
   ```bash
   npm run db:init
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

## Database Features

### Persistent Research Sessions
- **Session Management**: All research sessions are automatically saved to the database
- **Graph Persistence**: Research graphs with nodes, edges, and metadata are preserved
- **Source Tracking**: Citations and sources are stored with full metadata
- **Step History**: Detailed step-by-step research process is recorded

### User Preferences
- **Settings Sync**: User preferences and configuration sync across devices
- **Session Continuity**: Research sessions can be resumed from any device
- **History Management**: Access to recent research sessions and patterns

### Performance Optimization
- **Intelligent Caching**: Frequently accessed data is cached for faster retrieval
- **Fallback Support**: Automatic fallback to localStorage if database is unavailable
- **Background Sync**: Non-blocking database operations maintain UI responsiveness

## Database Schema

### Core Tables
- `users` - User sessions and preferences
- `research_sessions` - Main research session data
- `research_steps` - Individual research steps and metadata
- `research_sources` - Citations and source references
- `graph_nodes` - Research graph node data
- `graph_edges` - Relationships between graph nodes
- `function_calls` - LangGraph function call tracking

### Views and Functions
- `session_summary` - Aggregated session statistics
- `update_updated_at_column()` - Automatic timestamp updates

## Environment Configuration

### Azure PostgreSQL Settings
```bash
# Required for Azure PostgreSQL Flexible Server
VITE_DB_HOST=reveriesdb.postgres.database.azure.com
VITE_DB_USER=hperkins
VITE_DB_PORT=5432
VITE_DB_NAME=reveries
VITE_DB_PASSWORD=your-password
VITE_DB_SSL=true

# Enable database persistence
VITE_ENABLE_DATABASE_PERSISTENCE=true
VITE_ENABLE_LOCAL_FALLBACK=true
```

### Local Development Settings
```bash
# Local Docker PostgreSQL
VITE_DB_HOST=localhost
VITE_DB_USER=reveries_user
VITE_DB_PORT=5432
VITE_DB_NAME=reveries_db
VITE_DB_PASSWORD=reveries_password
VITE_DB_SSL=false
```

## Available Commands

### Database Management
```bash
npm run db:test      # Test database connection
npm run db:init      # Initialize database schema
npm run db:start     # Start local PostgreSQL (Docker)
npm run db:stop      # Stop local PostgreSQL
npm run db:logs      # View PostgreSQL logs
```

### Docker Management
```bash
npm run docker:up    # Start all services
npm run docker:down  # Stop all services
npm run docker:logs  # View all service logs
```

## Troubleshooting

### Connection Issues

1. **Azure PostgreSQL Connection Failed**
   - Verify firewall rules allow your IP address
   - Check that SSL mode is properly configured
   - Ensure the database and user exist
   - Verify password is correct

2. **Local Docker Issues**
   - Ensure Docker is running
   - Check if port 5432 is available
   - Verify docker-compose.yml configuration
   - Try rebuilding containers: `docker-compose down && docker-compose up --build`

3. **Application Issues**
   - Check `.env.local` file exists and is properly configured
   - Verify `VITE_ENABLE_DATABASE_PERSISTENCE=true`
   - Check browser console for connection errors
   - Test database connection independently: `npm run db:test`

### Performance Optimization

1. **Azure PostgreSQL**
   - Use connection pooling for high-traffic scenarios
   - Monitor DTU/vCore usage
   - Consider read replicas for scaling
   - Enable query performance insights

2. **Local Development**
   - Increase shared_buffers in PostgreSQL config
   - Use SSD storage for better I/O performance
   - Monitor container resource usage

## Security Considerations

### Azure PostgreSQL
- Always use SSL connections (`sslmode=require`)
- Implement proper firewall rules
- Use Azure AD authentication when possible
- Regular security updates and patches
- Monitor access logs

### Local Development
- Change default passwords in production
- Use environment variables for credentials
- Keep Docker images updated
- Isolate database networks

## Monitoring and Maintenance

### Health Checks
The application includes built-in database health monitoring:
- Connection status is checked every 30 seconds
- Automatic fallback to localStorage on connection failure
- Health status displayed in application UI

### Maintenance Tasks
- Automatic cleanup of sessions older than 30 days
- Regular VACUUM and ANALYZE operations (Azure managed)
- Monitor connection pool usage
- Track query performance

## Integration with LangGraph

The database service integrates seamlessly with the LangGraph patterns:
- **Function Call Tracking**: All AI function calls are logged with timing and results
- **Paradigm Persistence**: Host paradigm probabilities and context layers are stored
- **Research Graph Visualization**: Complete graph state is preserved for export and analysis
- **Session Analytics**: Comprehensive statistics and performance metrics

## Migration and Backup

### Data Migration
- Export research sessions to JSON/Markdown format
- Import historical data from localStorage
- Bulk transfer between database instances

### Backup Strategy
- Azure PostgreSQL: Automated backups with point-in-time recovery
- Local: Regular pg_dump exports to secure storage
- Application-level exports for critical research data

---

For additional support, refer to the [Azure PostgreSQL documentation](https://docs.microsoft.com/en-us/azure/postgresql/) and the [PostgreSQL official documentation](https://www.postgresql.org/docs/).
