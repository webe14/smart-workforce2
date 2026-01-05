# Backend API Guide

## Base URL
`http://localhost:5000/api`

## Authentication
All endpoints except `/auth/login` and `/auth/register` require JWT token in Authorization header: `Bearer <token>`

## Endpoints

### Authentication
- `POST /auth/register` - Register new user (Admin only)
- `POST /auth/login` - Login user

### Users
- `GET /users` - Get all users (Admin/HR)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user (Admin)
- `DELETE /users/:id` - Delete user (Admin)

### Attendance
- `POST /attendance/checkin` - Check in
- `POST /attendance/checkout` - Check out
- `GET /attendance` - Get attendance records

### Shifts
- `POST /shifts` - Create shift (Admin/HR)
- `GET /shifts` - Get shifts
- `PUT /shifts/:id` - Update shift (Admin/HR)
- `DELETE /shifts/:id` - Delete shift (Admin/HR)

### Leaves
- `POST /leaves` - Create leave request
- `GET /leaves` - Get leave requests
- `PUT /leaves/:id` - Update leave status (Admin/HR)
- `DELETE /leaves/:id` - Delete leave request (Admin/HR)

### Reports
- `GET /reports/attendance` - Get attendance report (Admin/HR)
- `GET /reports/payroll` - Get payroll report (Admin/HR)
- `POST /reports/payroll` - Create payroll record (Admin/HR)

## Response Format
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

## Error Format
```json
{
  "success": false,
  "message": "Error message"
}