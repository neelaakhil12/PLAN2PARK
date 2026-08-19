const Razorpay = require('/home/ubuntu/PLAN2PARK/backend/node_modules/razorpay');

const rzp = new Razorpay({
  key_id: 'rzp_test_TMLHMiwE70n6U3',
  key_secret: 'oLI2jLM98oF9Lc6Tym6EPxJJ'
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
