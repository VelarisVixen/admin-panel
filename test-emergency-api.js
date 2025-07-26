// Test script for emergency notification API
const testEmergencyDispatch = async () => {
  console.log('🧪 Testing emergency dispatch API...');
  
  const testData = {
    reportId: 'test_' + Date.now(),
    location: 'Emergency Location: 30.3802, 76.8621',
    coordinates: {
      lat: 30.380171837558176,
      lng: 76.86209667874708
    },
    emergencyType: 'Emergency SOS activated - automatic recording',
    emergencyServices: [
      {
        recipient: 'Topkhana Police Station',
        phone: '+91-8168006394',
        serviceName: 'Topkhana Police Station',
        serviceType: 'Police Station',
        icon: '👮',
        address: 'Address not available',
        distance: '2.0 km',
        eta: '3 mins',
        routeUrl: 'https://www.google.com/maps/dir/30.3684277,76.8463762/30.380171837558176,76.86209667874708',
        directionsText: '📍 From: Topkhana Police Station 📍 Address not available 📍 To: Emergency Location (30.380171837558176, 76.86209667874708) ⏱️ ETA: 3 mins 📏 Distance: 2.0 km 📞 Contact: +91-8168006394'
      },
      {
        recipient: 'Military Hospital, Ambala',
        phone: '+91-7819834452',
        serviceName: 'Military Hospital, Ambala',
        serviceType: 'Hospital',
        icon: '🏥',
        address: 'Haryana',
        distance: '4.2 km',
        eta: '6 mins',
        routeUrl: 'https://www.google.com/maps/dir/30.3523084,76.8333001/30.380171837558176,76.86209667874708',
        directionsText: '📍 From: Military Hospital, Ambala 📍 Haryana 📍 To: Emergency Location (30.380171837558176, 76.86209667874708) ⏱️ ETA: 6 mins 📏 Distance: 4.2 km 📞 Contact: +91-7819834452'
      }
    ],
    publicRecipients: [
      { name: 'Emergency Contact', phone: '+91-9996101244', distance: '0.0km' }
    ],
    adminNotes: 'Emergency approved for immediate dispatch'
  };

  try {
    const response = await fetch('http://localhost:5000/api/emergency/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('📊 API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Test successful!');
      console.log(`📱 Total sent: ${result.totalSent}`);
      console.log(`❌ Total failed: ${result.totalFailed}`);
      console.log('📋 SMS Results:');
      result.smsResults.forEach(sms => {
        console.log(`  - ${sms.recipient} (${sms.phone}): ${sms.success ? '✅' : '❌'} ${sms.simulated ? '(simulated)' : '(real)'}`);
      });
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
};

// Run test if called directly
if (typeof window === 'undefined') {
  testEmergencyDispatch();
}

module.exports = { testEmergencyDispatch };
