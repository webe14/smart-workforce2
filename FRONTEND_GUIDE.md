# Frontend Guide

## Project Structure
```
Frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── DashboardCard.jsx
│   │   └── NotificationPanel.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Attendance.jsx
│   │   ├── Shifts.jsx
│   │   ├── LeaveRequests.jsx
│   │   ├── Employees.jsx
│   │   └── Reports.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useFetch.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── public/
│   └── index.html
├── package.json
└── tailwind.config.js
```

## Setup Instructions
1. Navigate to Frontend directory
2. Run `npm install`
3. Run `npm start` to start development server

## Features
- **Login**: User authentication
- **Dashboard**: Overview with cards and notifications
- **Attendance**: Check-in/check-out functionality
- **Shifts**: View assigned shifts
- **Leave Requests**: Submit and view leave requests
- **Employees**: Manage users (Admin/HR only)
- **Reports**: View attendance and payroll reports (Admin/HR only)

## Authentication
Uses JWT tokens stored in localStorage. Context provider manages auth state.

## Styling
Built with Tailwind CSS for responsive design.

## API Integration
Uses Axios for HTTP requests with automatic token attachment.