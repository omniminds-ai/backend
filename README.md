# Backend Server

This is the backend server for the Jailbreak project. It handles database operations and API endpoints through a Docker container.

## Tournament CLI Commands

The backend provides CLI commands for managing tournaments through Docker:

- Initialize a new tournament:

```bash
docker exec backend npm run init-tournament -- -n "test1" -t "title test" -d "description test" -s "system prompt test" [-m <model>] [-c <character-limit>] [-p <pool>]
```

- Start a tournament:

```bash
docker exec backend npm run tournament -- init-account
docker exec backend npm run start-tournament -- -n <name> 
```

- Conclude a tournament:

```bash
docker exec backend npm run conclude-tournament -- -n <name> -w <winner-address>
```

## Database Operations

The backend handles all database operations for tournaments through MongoDB, including:

- Storing tournament information
- Tracking tournament status
- Managing tournament participants
- Recording tournament results

## Development

The backend runs in a Docker container. Use docker-compose to manage the service:

```bash
# Start the services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Execute commands in container
docker exec backend npm run <command>

# Stop services
docker-compose down
