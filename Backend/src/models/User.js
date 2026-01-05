import pool from '../config/db.js';

class User {
  static async generateNextId(role) {
    let prefix = 'EMP';
    if (role === 'hr') prefix = 'HR';
    if (role === 'attendance_manager') prefix = 'AM';

    // Find the highest number for this prefix
    const [rows] = await pool.execute(
      `SELECT employee_id FROM users WHERE employee_id LIKE ? ORDER BY employee_id DESC LIMIT 1`,
      [`${prefix}-%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const lastId = rows[0].employee_id;
      // Extract number from format PREFIX-XXX
      const parts = lastId.split('-');
      if (parts.length > 1) {
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  static async create(userData) {
    let {
      full_name = null,
      email = null,
      password = null,
      role = 'employee',
      department = null,
      phone_number = null,
      salary = null,
      sex = null,
      profile_picture = null,
      face_descriptor = null,
      joining_date = new Date(),
      employee_id = null,
      dob = null,
      city = null,
      woreda = null,
      kebele = null,
      education_level = null,
      field_of_study = null,
      institution_name = null,
      graduation_year = null,
      job_title = null,
      employment_type = null,
      hire_date = null,
      work_location = null,
      emergency_contact_name = null,
      emergency_contact_phone = null,
      remarks = null
    } = userData;

    // Generate automatic ID if not provided for specific roles
    if (!employee_id && ['employee', 'hr', 'attendance_manager'].includes(role)) {
      employee_id = await this.generateNextId(role);
    }

    // Sanitize values: convert empty strings to null for the DB
    const values = [
      full_name, email, password, role, department, phone_number, salary, sex,
      profile_picture, face_descriptor, joining_date, employee_id, dob, city,
      woreda, kebele, education_level, field_of_study, institution_name,
      graduation_year, job_title, employment_type, hire_date, work_location,
      emergency_contact_name, emergency_contact_phone, remarks
    ].map(val => (val === '' ? null : val));

    console.log(`🚀 Executing INSERT for employee_id: ${employee_id}`);

    try {
      const [result] = await pool.execute(
        `INSERT INTO users (
          full_name, email, password, role, department, phone_number, salary, sex, 
          profile_picture, face_descriptor, joining_date, employee_id, dob, city, 
          woreda, kebele, education_level, field_of_study, institution_name, 
          graduation_year, job_title, employment_type, hire_date, work_location, 
          emergency_contact_name, emergency_contact_phone, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
      console.log(`✅ User created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (err) {
      console.error('❌ Database Insert Error:', err);
      throw err;
    }
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT user_id, employee_id, full_name, email, role, job_title, department, 
              phone_number, status, salary, sex, dob, city, woreda, kebele, 
              education_level, field_of_study, institution_name, graduation_year, 
              employment_type, hire_date, work_location, emergency_contact_name, 
              emergency_contact_phone, remarks, profile_picture, face_descriptor, 
              joining_date FROM users WHERE user_id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT user_id, employee_id, full_name, email, role, job_title, department, 
              phone_number, status, salary, sex, dob, city, woreda, kebele, 
              education_level, field_of_study, institution_name, graduation_year, 
              employment_type, hire_date, work_location, emergency_contact_name, 
              emergency_contact_phone, remarks, profile_picture, face_descriptor, 
              joining_date FROM users`
    );
    return rows;
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];

    const fieldMap = {
      full_name: 'full_name',
      email: 'email',
      phone_number: 'phone_number',
      phone: 'phone_number',
      department: 'department',
      role: 'role',
      status: 'status',
      salary: 'salary',
      sex: 'sex',
      profile_picture: 'profile_picture',
      face_descriptor: 'face_descriptor',
      joining_date: 'joining_date',
      employee_id: 'employee_id',
      dob: 'dob',
      city: 'city',
      woreda: 'woreda',
      kebele: 'kebele',
      education_level: 'education_level',
      field_of_study: 'field_of_study',
      institution_name: 'institution_name',
      graduation_year: 'graduation_year',
      job_title: 'job_title',
      employment_type: 'employment_type',
      hire_date: 'hire_date',
      work_location: 'work_location',
      emergency_contact_name: 'emergency_contact_name',
      emergency_contact_phone: 'emergency_contact_phone',
      remarks: 'remarks'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (userData[key] !== undefined) {
        fields.push(`${dbField} = ?`);
        // Sanitize: convert empty strings to null for SQL
        values.push(userData[key] === '' ? null : userData[key]);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
  }

  static async delete(id) {
    await pool.execute('DELETE FROM users WHERE user_id = ?', [id]);
  }

  static async findByRoles(roles) {
    if (!roles || roles.length === 0) return [];
    const placeholders = roles.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT user_id, full_name, role FROM users WHERE role IN (${placeholders})`,
      roles
    );
    return rows;
  }
}

export default User;