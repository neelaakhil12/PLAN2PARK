const Razorpay = require('/home/ubuntu/PLAN2PARK/backend/node_modules/razorpay');

const rzp = new Razorpay({
  key_id: 'rzp_live_TidhMuvoj4fV3b',
  key_secret: 'w94G6QL64Q8y9RIOBOXZZE2r'
});

rzp.orders.create({
  amount: 8000,
  currency: 'INR',
  receipt: 'rcpt_test_001'
}).then(order => {
  console.log('SUCCESS: Razorpay Order created:', order);
  process.exit(0);
}).catch(err => {
  console.error('ERROR from Razorpay API:', err);
  process.exit(1);
});
