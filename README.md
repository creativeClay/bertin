

## **Project: Task Management & Real-Time Notifications System**

**Goal:** Build a simple task management system where users can create, assign, update, and track tasks, with real-time notifications for status changes.

**Tech Stack:**

* **Frontend:** Angular 16+
* **Backend:** Node.js + Express
* **Database:** PostgreSQL
* **Containerization:** Docker + Docker Compose
* **Bonus:** WebSockets or Socket.IO for real-time notifications

---

### **Functional Requirements**

1. **User Management**

   * Register and login users (simple JWT authentication is enough).
   * Each user can be assigned tasks.

2. **Task Management**

   * CRUD operations on tasks (Create, Read, Update, Delete).
   * Task attributes: `title`, `description`, `assigned_to`, `status` (`Pending`, `In Progress`, `Completed`), `due_date`.
   * List tasks by status and assigned user.

3. **Real-Time Notifications**

   * When a task is created or status changes, the assigned user receives a notification.
   * Use WebSockets (Socket.IO) or polling as fallback.

4. **Dashboard**

   * Show task summary: total tasks, pending, in-progress, completed.
   * Simple task table with ability to filter by user and status.

5. **Dockerized Setup**

   * Backend, frontend, and PostgreSQL in Docker containers.
   * Docker Compose file to bring up the full environment with one command.
   * Environment variables for DB credentials.

---

### **Bonus Features (Optional)**

* Task deadlines with overdue highlighting.
* Ability to assign multiple users to a task.
* Pagination for task lists.
* Export tasks as CSV.

---

### **Project Constraints for 1–2 Day Completion**

* Use minimal UI (Angular Material or Bootstrap for simplicity).
* Focus on **working full stack** and Docker Compose integration.
* Real-time notifications can be a simple message in the frontend when tasks change.

---

### **Docker Compose Layout**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: task_db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: taskdb
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: task_backend
    environment:
      DB_USER: user
      DB_PASSWORD: password
      DB_HOST: db
      DB_NAME: taskdb
      JWT_SECRET: secret
    ports:
      - "3000:3000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    container_name: task_frontend
    ports:
      - "4200:80"
    depends_on:
      - backend

volumes:
  db_data:
```

---

### **Evaluation Criteria**

1. **Full-Stack Integration:** Angular frontend communicates with Node.js backend with PostgreSQL persistence.
2. **Dockerization:** Full setup runs via `docker compose up` without manual configuration.
3. **Code Quality:** Clear folder structure, separation of concerns, meaningful variable names.
4. **Functionality:** CRUD tasks, user assignment, dashboard, notifications.
5. **Optional Bonus:** WebSocket real-time notifications, filtering, or task export.

---

### **How to Run**

#### Quick Start (Docker)

**1. Clone the repository:**
```bash
git clone https://github.com/creativeClay/bertin.git
cd bertin
```

**2. Create a `.env` file in the root folder:**
```bash
# Database Configuration
DB_HOST=db
DB_NAME=taskdb
DB_USER=user
DB_PASSWORD=password

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# App Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:4200
APP_NAME=Task Manager

# Email Configuration (Optional - for email notifications)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

**3. Start all services:**
```bash
docker compose up --build -d
```

**4. View logs (optional):**
```bash
docker compose logs -f
```

The application will be available at:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| API | http://localhost:3000 |
| Database | localhost:5433 |

#### Stop the Application

```bash
# Stop containers (preserves data)
docker compose down

# Stop and remove all data
docker compose down -v
```

#### Rebuild After Code Changes

```bash
docker compose up --build -d
```

---

#### Development Setup (Without Docker)

**Backend:**
```bash
cd api
npm install
cp .env.example .env  # Edit with your DB credentials
npm run dev
```

**Frontend:**
```bash
cd app
npm install
npm start
```

#### Running Tests

```bash
# Backend tests
cd api && npm test

# Frontend tests
cd app && npm test
```

---
