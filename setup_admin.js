require('dotenv').config({ path: './backend/.env' });
const connectDB = require('./backend/dbconfig');
const User = require('./backend/models/User');

async function setupAdmin() {
  await connectDB();

  let admin = await User.findOne({ email: 'admin@cosmetics.com' });
  if (!admin) {
    admin = new User({
      name: 'System Admin',
      email: 'admin@cosmetics.com',
      role: 'admin',
      password: 'Admin@123456',
      isActive: true,
    });
    await admin.save();
    console.log('Admin account created successfully.');
  } else {
    admin.role = 'admin';
    admin.name = 'System Admin';
    admin.isActive = true;
    admin.password = 'Admin@123456';
    await admin.save();
    console.log('Admin account updated successfully.');
  }

  // Verify comparePassword
  const check = await User.findOne({ email: 'admin@cosmetics.com' }).select('+password');
  const isMatch = await check.comparePassword('Admin@123456');
  console.log('Password verification match:', isMatch);
  process.exit(0);
}

setupAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
