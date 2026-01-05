import User from '../models/User.js';
import AuditLog from '../models/AuditLogs.js';

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    console.log(`📋 Fetched ${users.length} users from database`);
    res.json(users);
  } catch (error) {
    console.error('❌ DB Error in getUsers:', error);
    // Return mock users for testing
    const mockUsers = [
      { user_id: 1, full_name: 'Admin User', email: 'admin@gmail.com', role: 'admin', status: 'active' },
      { user_id: 2, full_name: 'HR User', email: 'hr@gmail.com', role: 'hr', status: 'active' },
      { user_id: 3, full_name: 'Employee One', email: 'emp1@gmail.com', role: 'employee', status: 'active' },
      { user_id: 4, full_name: 'Employee Two', email: 'emp2@gmail.com', role: 'employee', status: 'active' }
    ];
    res.json(mockUsers);
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If a profile picture was uploaded, add its path
    if (req.file) {
      updateData.profile_picture = `/uploads/profile_pictures/${req.file.filename}`;
    }

    await User.update(req.params.id, updateData);
    await AuditLog.create({ user_id: req.user.id, action: 'Update User', entity: 'users', entity_id: req.params.id, ip_address: req.ip });
    res.json({ message: 'User updated', profile_picture: updateData.profile_picture });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    await AuditLog.create({ user_id: req.user.id, action: 'Delete User', entity: 'users', entity_id: req.params.id, ip_address: req.ip });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    console.log('📝 Received createUser request with body:', JSON.stringify({ ...req.body, face_descriptor: req.body.face_descriptor ? '[DESCRIPTOR DATA]' : 'missing', password: '[HIDDEN]' }));

    const {
      full_name, email, password, role, department, phone_number, salary, sex,
      employee_id, dob, city, woreda, kebele, education_level, field_of_study,
      institution_name, graduation_year, job_title, employment_type, hire_date,
      work_location, emergency_contact_name, emergency_contact_phone, remarks,
      face_descriptor
    } = req.body;

    // Prepare user data
    const userData = {
      full_name, email, password, role, department, phone_number, salary, sex,
      employee_id, dob, city, woreda, kebele, education_level, field_of_study,
      institution_name, graduation_year, job_title, employment_type, hire_date,
      work_location, emergency_contact_name, emergency_contact_phone, remarks,
      face_descriptor
    };

    // If a profile picture was uploaded, add its path
    if (req.file) {
      userData.profile_picture = `/uploads/profile_pictures/${req.file.filename}`;
    }

    const userId = await User.create(userData);

    try {
      await AuditLog.create({
        user_id: req.user?.id || 1,
        action: 'Create User',
        entity: 'users',
        entity_id: userId,
        ip_address: req.ip
      });
    } catch (auditError) {
      console.warn('⚠️ Failed to create audit log, but user was created:', auditError.message);
    }

    res.status(201).json({
      message: 'User created successfully',
      userId,
      profile_picture: userData.profile_picture
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If a file was uploaded, add its path to the update data
    if (req.file) {
      // Store the relative path that will be served
      // We serve 'uploads' as static, so the path should be '/uploads/profile_pictures/filename'
      updateData.profile_picture = `/uploads/profile_pictures/${req.file.filename}`;
    }

    // Users can only update their own profile
    await User.update(req.user.id, updateData);
    await AuditLog.create({ user_id: req.user.id, action: 'Update Profile', entity: 'users', entity_id: req.user.id, ip_address: req.ip });

    // Return the new profile picture URL if updated
    res.json({
      message: 'Profile updated successfully',
      profile_picture: updateData.profile_picture
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNextId = async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) return res.status(400).json({ message: 'Role is required' });
    const nextId = await User.generateNextId(role);
    res.json({ nextId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getUsers, getUser, updateUser, deleteUser, createUser, updateProfile, getNextId };