const { db } = require('./config/firebase');
const User = require('./models/user.model');

async function testUserLookup() {
  try {
    console.log('Testing user lookup functionality...');
    
    // Get all users from the database
    const usersSnapshot = await db.collection('users').get();
    console.log(`\nFound ${usersSnapshot.size} users in database:`);
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`- User ID: ${doc.id}`);
      console.log(`  Display Name: ${userData.displayName || 'NOT SET'}`);
      console.log(`  Email: ${userData.email || 'NOT SET'}`);
      console.log(`  Created At: ${userData.createdAt ? userData.createdAt.toDate() : 'NOT SET'}`);
      console.log('');
    });
    
    // Test the User.getById method
    if (usersSnapshot.size > 0) {
      const firstUserId = usersSnapshot.docs[0].id;
      console.log(`\nTesting User.getById for user: ${firstUserId}`);
      
      const user = await User.getById(firstUserId);
      console.log('Result:', user);
    }
    
  } catch (error) {
    console.error('Error testing user lookup:', error);
  }
}

// Run the test
testUserLookup().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 
const User = require('./models/user.model');

async function testUserLookup() {
  try {
    console.log('Testing user lookup functionality...');
    
    // Get all users from the database
    const usersSnapshot = await db.collection('users').get();
    console.log(`\nFound ${usersSnapshot.size} users in database:`);
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`- User ID: ${doc.id}`);
      console.log(`  Display Name: ${userData.displayName || 'NOT SET'}`);
      console.log(`  Email: ${userData.email || 'NOT SET'}`);
      console.log(`  Created At: ${userData.createdAt ? userData.createdAt.toDate() : 'NOT SET'}`);
      console.log('');
    });
    
    // Test the User.getById method
    if (usersSnapshot.size > 0) {
      const firstUserId = usersSnapshot.docs[0].id;
      console.log(`\nTesting User.getById for user: ${firstUserId}`);
      
      const user = await User.getById(firstUserId);
      console.log('Result:', user);
    }
    
  } catch (error) {
    console.error('Error testing user lookup:', error);
  }
}

// Run the test
testUserLookup().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 
 