 const { response } = require('express');
const express = require('express');
const twilio = require('twilio');
const twilioHelpers = require('../helpers/twilio-helpers');
const session = require('express-session');
const userHelper = require('../helpers/user-helper');
const router = express.Router();
const productHelpers=require('../helpers/Product-helper');
const async = require('hbs/lib/async');
const e= require('express');
const adminHelpers = require('../helpers/admin-helpers');

const verifyLogin=function(req,res,next){
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/')
  }
}
let sarchProduct=null

//************************************home
router.get('/',async function(req, res, next) { 
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0

  if(req.session.user){
   cartCount=await userHelper.getCartCount(req.session.user._id)
   wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
  }
  let category= await productHelpers.getAllCategory()
  let banner=await adminHelpers.getBanner()

 

  productHelpers.getAllProducts().then((products) =>{
    if(sarchProduct){
      products=sarchProduct
    }
 
  res.render('user/user-index', { layout:'user-layout',user:true,users,products,cartCount,wishlistCount,category,banner})
  sarchProduct=null;
  })
}catch(err){
  next(err)
}
});
//*********************************************************************************login page
router.get('/login',(req,res,next)=>{
  try{
    if(req.session.loggedIn){
      res.redirect('/')
    }else{
      res.render('user/user-login',{layout:'user-layout','loginErr':req.session.loginErr})
      req.session.loginErr=false;
    }
  }catch(err){
    next(err)
  }
})
router.post('/login',(req,res,next)=>{
  try{ 
  userHelper.dologin(req.body).then((response)=>{
    if(response.status){
     
      req.session.loggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      if(response.blockStatus){
        req.session.loginErr="access denied"
        res.redirect('/login')
      }else{
        req.session.loginErr="invalid username"
        res.redirect('/login')
      }}
  }) 
}catch(err){
  next(err)
}
})

//**************************************************************signin
router.get('/signin',(req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/')
  }else{
    res.render('user/user-signin',{layout:'user-layout','signinErr': req.session.signinErr})
    req.session.signinErr=false
  }
 
})
router.post('/signin',(req,res,next)=>{
  try{
   
    userHelper.existinguser(req.body).then((response)=>{
      if(response.status){
        console.log('processing');
        req.session.signin=true
        req.session.body=req.body
        twilioHelpers.dosms(req.session.body).then((data)=>{
          if(data){
            res.redirect('/otp')
          }else{
            res.redirect('/signin');
          }
        })
      }else{ 
        console.log('rrrrrrrrrrrrrrrrrrrrrrrrrong');
        req.session.signinErr="email or phone number already registred"
        res.redirect('/signin')
      }   
 })

 
}catch(err){
  next(err)
}
 
})
//********************************* */ otp render
router.get('/otp',(req,res)=>{
  res.render('user/otp',{layout:'user-layout' ,'otploginErr':req.session.otpLoginErr})
  req.session.otpLoginErr=false;
})
// post otp
router.post('/otp',(req,res,next)=>{
  try{
  twilioHelpers.otpVerify(req.body,req.session.body).then((response)=>{
    if(response.valid){
      userHelper.doSingnup(req.session.body).then((response)=>{
        console.log(response);
        res.redirect('/login')
      })
    }else{
        req.session.otpLoginErr=true
      res.redirect('/otp')
    }
  })
}catch(err){
  next(err)
}
})
//************************************************************productDetails
router.get('/product-details',async(req,res,next)=>{
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0

  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   
   }
   let category= await productHelpers.getAllCategory()
  productHelpers.getAProduct(req.query.id).then((product) => {
  res.render('user/product-details',{layout:'user-layout',product,users,user:true,cartCount,wishlistCount,category})
  }).catch((err)=>{
    next(err)
  })
}catch(err){
  next(err)
}

})
// add to cart
router.get('/add-to-cart/:id',verifyLogin,(req,res,next)=>{
  try{
  let users=req.session.user
  userHelper.addToCart(req.params.id,users._id).then(()=>{
     res.json({status:true})
  })
}catch(err){
  next(err)
}
})
//add wishlist

router.get('/add-to-wishlist/:id',verifyLogin,(req,res,next)=>{
 try{
    let users=req.session.user
    userHelper.addToWishlist(req.params.id,users._id).then((response)=>{
       res.json(response)
    })
  }catch(err){
    next(err)
  }
  })


   //get cart
  router.get('/cart',verifyLogin,async(req,res,next)=>{
    try{
      let cartCount=0
  let wishlistCount=0
    let users=req.session.user
    if(users){
      cartCount=await userHelper.getCartCount(req.session.user._id)
      wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
     }
     let category= await productHelpers.getAllCategory()
    let product=await userHelper.getAllCartProducts(req.session.user._id)
    // let sum=await userHelper.getCartEachProductTotal(req.session.user._id)
    let total=await userHelper.getCartTotal(req.session.user._id)
    res.render('user/cart',{layout:'user-layout',user:true,users,product,total,wishlistCount,cartCount,category})
    }catch(err){
      next(err)
    }
  })
  //delete cart product
  router.get('/deleteCartproduct/:id/:ik',function(req,res,next){
    try{
    let cartId=req.params.id
    let proId=req.params.ik
    let userId=req.session.user._id
    userHelper.deleteCartProduct(cartId,proId,userId).then((response)=>{
     res.redirect('/cart')
    })
  }catch(err){
    next(err)
  }
})
  // ***************************888888888888888888888888888888888888888888888888/changr-producct-qundity
  router.post('/change-product-quantity',verifyLogin,(req,res,next)=>{
    try{
    userHelper.changeProductQuandity(req.body).then(async(response)=>{
      response.total=await userHelper.getCartTotal(req.body.user)
      res.json(response)       
    })
  }catch(err){
    next(err)
  }
  })
// 8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888
    //get wishlist
    router.get('/wishlist',verifyLogin,async(req,res,next)=>{
      try{
      let users=req.session.user
      let cartCount=0
  let wishlistCount=0
      if(users){
        cartCount=await userHelper.getCartCount(req.session.user._id)
        wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
       }
       let category= await productHelpers.getAllCategory()
      let product=await userHelper.getAllWishlistProducts(req.session.user._id)
      res.render('user/wishlist',{layout:'user-layout',user:true,users,product,wishlistCount,cartCount,category})
      }catch(err){
        next(err)
      }
    })
 
  // add to wishlist
router.get('/wishlist/:id',verifyLogin,(req,res,next)=>{
  try{
  let users=req.session.user
  userHelper.addToWishlist(req.params.id,users._id).then(()=>{
    res.redirect('/')
   
  })
}catch(err){
  next(err)
}
})

 //delete cart wishlist
 router.get('/deleteWishlistProduct/:id/:ik',function(req,res,next){
  try{
  let wishlistId=req.params.id
  let proId=req.params.ik
  let userId=req.session.user._id
  userHelper.deleteWishlistProduct(wishlistId,proId,userId).then((response)=>{
   res.redirect('/wishlist')
  })
}catch(err){
  next(err)
}
})
//********************************************************* */ 
router.get('/products/:id',async(req,res,next)=>{
  try{
  let users=req.session.user
  wishlistCount=0
  cartCount=0
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
  res
  let category= await productHelpers.getAllCategory()
 let product=await userHelper.getProductCategory(req.params.id)
 res.render('user/products',{layout:'user-layout',user:true,product,category,users,cartCount,wishlistCount})
  }catch(err){
    next(err)
  }
})

router.get('/checkout',verifyLogin, async(req,res,next)=>{
  try{
    let cartCount=0
  let wishlistCount=0
  let users=req.session.user
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   if(cartCount==0){
    res.redirect('/cart')
   }else{
    let coupon = await userHelper.getCoupon()
    console.log(coupon);


    
   let category= await productHelpers.getAllCategory()
  let total=await userHelper.getCartTotal(req.session.user._id)
  let data=await userHelper.getUserDetails(req.session.user._id)
  let product=await userHelper.getAllCartProducts(req.session.user._id)
 userHelper.getAddress(req.session.user._id).then((address)=>{
  res.render('user/checkout',{layout:'user-layout',user:true,total,
  user:req.session.user,users,data,product,wishlistCount,cartCount,address,category,coupon})
 })
}
  }catch(err){
    next(err)
  }
 
})
router.post('/checkout',async(req,res,next)=>{
 try{
  let userId=''+req.body.userId
  // ppppppppppppprrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr
  let products= await userHelper.getCartProducts(userId)
   products=products.product
   let totalPrice=await userHelper.getCartTotal(userId)
  let address=await userHelper.getDelivaryAddress(userId,req.body.address)



  
  userHelper.placeOrder(req.body,products,address).then((orderId)=>{

    if(req.body['payment-method']==='COD'){
      console.log('cash on delivary');
      res.json({codSuccess:true})
    }else{
      userHelper.generateRazorpay(orderId,req.body.total).then((response)=>{
        console.log('raserpay');
        res.json(response)
      })
    }
   
  })
 }catch(err){
  next(err)
 }
  
})
router.get('/paymentSucess',verifyLogin,async(req,res,next)=>{
  let users=req.session.user
  try{
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
    let category= await productHelpers.getAllCategory()
  res.render('user/paymentSucess',{layout:'user-layout',user:true,users,wishlistCount,cartCount,category})
  }catch(err){
    next(err)
  }
})
router.get('/viewOrders',verifyLogin,async(req,res,next)=>{
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   let category= await productHelpers.getAllCategory()
 let order=await userHelper.getAllOrderList(users._id)

//  if(order[0].delivaryAddress.discountPercentage!=NaN){
//   order[0].productTotal=order[0].productTotal*order[0].delivaryAddress.discountPercentage/100    
//  }

 console.log(order);
 console.log(' vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvview orders');
 const result = order.map((data)=>{
  if(data.delivaryAddress.discountPercentage!=NaN){
    return data.productTotal= data.productTotal-(data.productTotal*data.delivaryAddress.discountPercentage/100)
  }

 })
 console.log(result);
  res.render('user/viewOrders',{layout:'user-layout',user:true,order,users,wishlistCount,cartCount,category})
  }catch(err){
    next(err)
  } 
})
router.get('/view-order-products/:id/:pid',verifyLogin,async(req,res,next)=>{
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   let category= await productHelpers.getAllCategory()
 let products=await userHelper.getOrderProducts(req.params.id,req.params.pid)
 console.log('productsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss');
 console.log(products);
 console.log(products[0]. delivaryAddress.discountPercentage);
 console.log(products[0].qty);
 console.log(products[0].product.price);
 products[0].total=products[0].qty*products[0].product.price
 products[0].discount=(products[0].total*products[0]. delivaryAddress.discountPercentage)/100
 products[0].finaltotal=products[0].total- products[0].discount
 console.log(products);

 res.render('user/view-order-product',{layout:'user-layout',user:true,users,products,wishlistCount,cartCount,category})
  }catch(err){
    next(err)
  }

})
//invoice
router.get('/invoice/:id/:pid',verifyLogin,async(req,res)=>{
  let users=req.session.user
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   let category= await productHelpers.getAllCategory()
 let products=await userHelper.getOrderProducts(req.params.id,req.params.pid)
 console.log('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiinnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn');

 products[0].total=products[0].qty*products[0].product.price
 products[0].discount=(products[0].total*products[0]. delivaryAddress.discountPercentage)/100
 products[0].finaltotal=products[0].total- products[0].discount
 console.log(products);
  res.render('user/invoice',{layout:'user-layout',user:true,users,cartCount,wishlistCount,category,products})
})

// online payment
router.post('/verify-payment',(req,res,next)=>{
  try{
userHelper.verifyPayment(req.body).then(()=>{
userHelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
  console.log('payment sucessfull');
  res.json({status:true})
})
}).catch((err)=>{
  res.json({status:false,errMsg:'payment-failed'})
})
  }catch(err){
    next(err)
  }
})

// delete order product
router.get('/cancelOrder/:id/:pid',verifyLogin,(req,res,next)=>{
  try{
 userHelper.cancelOrder(req.params.id,req.params.pid).then(()=>{
 res.redirect('/viewOrders')
 })
}catch(err){
  next(err)
}
})

router.get('/shop', async(req,res,next)=>{
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   let category= await productHelpers.getAllCategory()
   productHelpers.getAllProducts().then((product) =>{
  res.render('user/shop',{layout:'user-layout',user:true,product,users,wishlistCount,cartCount,category})
   })
  }catch(err){
    next(err)
  }
})

router.get('/userProfile',verifyLogin,async(req,res,next)=>{
  try{
  let users=req.session.user
  let cartCount=0
  let wishlistCount=0
  if(users){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    wishlistCount=await userHelper.getWishlistCount(req.session.user._id)
   }
   let category= await productHelpers.getAllCategory()
   let data=await userHelper.getUserDetails(req.session.user._id)
  res.render('user/userProfile',{layout:'user-layout',user:true,users,wishlistCount,cartCount,data,category})
  }catch(err){
    next(err)
  }
})

router.post('/add-addressimage',verifyLogin,(req,res,next)=>{
try{
   if (req.files.Image) {
      let image = req.files.Image
      let id = req.session.user._id
      image.mv('./public/user-images/' + id + '.jpg')
    }
    res.redirect('back')
}catch(err){
  next(err)
}
})

// addresssssssssssssssssssssssssss
router.post('/add-address',verifyLogin,(req,res,next)=>{
try{
  userHelper.addAddress(req.session.user._id,req.body).then((response)=>{
    res.redirect('back')
  })
}catch(err){
  next(err)
}
})
// 
router.post('/add-deliveryAddress',verifyLogin,(req,res,next)=>{
try{
  userHelper.addDeliveryAddress(req.session.user._id,req.body).then((response)=>{
    
    res.redirect('back')
  })
}catch(err){
  next(err)
}
})
//sarch
router.post('/search',async(req,res,next)=>{
  try{
   sarchProduct=await userHelper.searchProducts(req.body.search)
  res.redirect('/')
  }catch(err){
    next(err)
  }
})
//forgot otp
router.get('/email',(req,res)=>{  
  res.render('user/email',{layout:'user-layout'})
})
router.post('/email',(req,res)=>{
  try{
  userHelper.getPhone (req.body.email).then((userData)=>{
   req.session.body=req.body
    if(userData.phone){
      twilioHelpers.dosms(userData).then((data)=>{
        if(data){
          res.render('user/forgotOtp',{layout:'user-layout',userData})
        }else{
          res.redirect('back');
        }
      })
     
    }else{
      res.render('user/email',{layout:'user-layout',userData})
    }
  })
}catch(err){
  next(err)
}
})
router.post('/forgotOtp',(req,res)=>{
  try{
    
  twilioHelpers.otpVerify(req.body,req.body).then((response)=>{
    if(response.valid){
     res.render('user/ChangePassword',{layout:'user-layout'})
    }else{
      res.redirect('/forgototp')
    }

  })
}catch(err){
  next(err)
}
       
})
router.post('/ChangePassword',(req,res)=>{
  try{
  userHelper.updatePassword(req.body,req.session.body).then((response)=>{
    res.redirect('/login')
  })
}catch(err){
  next(err)
}
})
/////////ameeer
router.post('/check-coupon',async(req, res, next) => {

  let userId = req.session.user._id
  let couponCode = req.body.coupon

  // let totalAmount = await userHelper.getTotalAmount(userId)
  let totalPrice=await userHelper.getCartTotal(userId)
  console.log(totalPrice);
  userHelper.checkCoupon(couponCode,totalPrice,userId).then((response) => {
    console.log(response);
      res.json(response)
  }).catch((response) => {
      res.json(response)
  })
}),


//******************************************************************logout

router.get('/logout',(req,res)=>{
  // req.session.destroy()
  req.session.user=null
  req.session.loggedIn=null
  res.redirect('/')
})

module.exports = router;
