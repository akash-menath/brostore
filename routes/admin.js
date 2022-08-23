const express = require('express');
const router = express.Router();
const adminHelper = require('../helpers/admin-helpers');
const userHelper = require('../helpers/user-helper');
const productHelpers = require('../helpers/Product-helper');
const async = require('hbs/lib/async');
/* verify login */
const verifyLogin = function (req, res, next) {
  if (req.session.adminloggedIn) {
    next()
  } else {
    res.redirect('/admin')
  }
}
// index

router.get('/', async function (req, res, next) {
  try {
    let admin = req.session.admin
    if (admin) {
      let delivery = {}
      delivery.pending = 'pending'
      delivery.Placed = 'Placed'
      delivery.Shipped = 'Shipped'
      delivery.Deliverd = 'Deliverd'
      delivery.Cancelled = 'Cancelled'
      const allData = await Promise.all
        ([
          adminHelper.onlinePaymentCount(),
          adminHelper.totalUsers(),
          adminHelper.totalOrder(),
          adminHelper.cancelOrder(),
          adminHelper.totalCOD(),
          adminHelper.totalDeliveryStatus(delivery.pending),
          adminHelper.totalDeliveryStatus(delivery.Placed),
          adminHelper.totalDeliveryStatus(delivery.Shipped),
          adminHelper.totalDeliveryStatus(delivery.Deliverd),
          adminHelper.totalDeliveryStatus(delivery.Cancelled),
          adminHelper.totalCost(),
        ]);
      res.render('admin/admin-index', {
        admin: true, layout: 'admin-layout', Dashboard: true,

        OnlinePymentcount: allData[0],
        totalUser: allData[1],
        totalOrder: allData[2],
        cancelOrder: allData[3],
        totalCod: allData[4],
        pending: allData[5],
        Placed: allData[6],
        Shipped: allData[7],
        Deliverd: allData[8],
        Cancelled: allData[9],
        totalCost: allData[10],
      })
    } else {
      res.render('admin/loggin', { layout: 'admin-layout', 'loginErr': req.session.loginErr })
      req.session.loginErr = false
    }
  } catch (err) {
    next(err)
  }
});
// login

router.post('/loggin', (req, res, next) => {
  try {
    adminHelper.dologin(req.body).then((response) => {
      if (response.status) {
        req.session.adminloggedIn = true
        req.session.admin = response.admin
        res.redirect('/admin')
      } else {
        req.session.loginErr = 'invalid username or password'
        res.redirect('/admin')
      }
    })
  } catch (err) {
    next(err)
  }

})
//    userdetais                 //                                    // users details
router.get('/users', function (req, res, next) {
  try {
    userHelper.getalluser().then((userdetails) => {
      res.render('admin/users', { admin: true, layout: 'admin-layout', userdetails, User: true })
      console.log(userdetails);

    })
  } catch (err) {
    next(err)
  }

});
// block user
router.get('/users/block_users/:id', (req, res, next) => {
  try {
    console.log(req.params.id);
    adminHelper.blockUsers(req.params.id).then(() => {
      res.redirect('/admin/users')
    })
  } catch (err) {
    next(err)
  }
})
// unblock user
router.get('/users/unblock_users/:id', (req, res, next) => {
  try {
    adminHelper.unBlockUsers(req.params.id).then(() => {
      res.redirect('/admin/users')
    })
  } catch (err) {
    next(err)
  }
})

// products                                         //product
router.get('/products', function (req, res, next) {
  try {
    productHelpers.getAllProducts().then((products) => {
      console.log(products);
      if (req.session.adminloggedIn) {
        res.render('admin/products', { products, admin: true, layout: 'admin-layout', Product: true })
      } else {
        res.redirect('/admin')
      }
    })
  } catch (err) {
    next(err)
  }
});

//  addproduct
router.get('/add-product', verifyLogin, function (req, res, next) {
  try {
    productHelpers.getCatogory().then((catogory) => {
      res.render('admin/add-products', { admin: true, layout: 'admin-layout', catogory, Product: true });
    })
  } catch (err) {
    next(err)
  }

});
router.post('/add-product', function (req, res, next) {
  try {
    productHelpers.addproduct(req.body).then((id) => {

      let image = req.files.Image;
      image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/products')
        }

      })
    })
  } catch (err) {
    next(err)
  }

})
// edit products

router.get('/editproduct/:id', verifyLogin, async (req, res, next) => {
  try {

    let product = await productHelpers.getProductDetails(req.params.id)
    productHelpers.getCatogory().then((catogory) => {

      res.render('admin/editproduct', { admin: true, layout: 'admin-layout', product, Product: true, catogory });
    })
  } catch (err) {
    next(err)
  }
})
router.post('/editproduct/:id', (req, res, next) => {
  try {
    productHelpers.upDateProduct(req.params.id, req.body).then(() => {
      res.redirect('/admin/products')
      console.log(req.files);
      if (req.files.Image) {
        let image = req.files.Image
        let id = req.params.id
        image.mv('./public/product-images/' + id + '.jpg')

      }

    })
  } catch (err) {
    next(err)
  }
})
// delete product
router.get('/deleteproduct/:id', function (req, res, next) {
  try {
    let proId = req.params.id
    productHelpers.deleteProduct(proId).then(() => {
      res.redirect('/admin/products')
    })
  } catch (err) {
    next(err)
  }
})

//catogory                                      //category

router.get('/catogory', function (req, res, next) {
  try {
    productHelpers.getCatogory().then((catogory) => {
      console.log(catogory);
      res.render('admin/catogory', { admin: true, layout: 'admin-layout', catogory, Category: true })
    })
  } catch (err) {
    next(err)
  }
});
// add catogory
router.get('/add-catogory', function (req, res, next) {
  try {
    res.render('admin/add-catogory', { admin: true, layout: 'admin-layout', Category: true })
  } catch (err) {
    next(err)
  }
})
router.post('/add-catogory', function (req, res, next) {
  try {
    productHelpers.addcatogory(req.body).then((data) => {
      if (data) {
        console.log(data);
        res.render('admin/add-catogory', { admin: true, layout: 'admin-layout', Category: true, data })
      } else {
        res.redirect('/admin/catogory')
      }
    })
  } catch (err) {
    next(err)
  }
})
router.get('/deletecatogory/:id', function (req, res, next) {
  try {
    let catogoryId = req.params.id
    productHelpers.deletecatogory(catogoryId).then(() => {
      res.redirect('/admin/catogory')
    })
  } catch (err) {
    next(err)
  }
})

// orderdetails
router.get('/order-details', async (req, res, next) => {
  try {

    adminHelper.getOrderDetails().then((order) => {
      console.log('lllllllllllllllllllllllllllllllllllllllllllllllll');
      console.log(order)
     
      const result = order.map((data)=>{
        data.productTotal= data.products.qty*data.result.price
        if(data.delivaryAddress.discountPercentage!=NaN){
           data.productTotal=data.productTotal-(data.productTotal*data.delivaryAddress.discountPercentage/100)
          
        }else{
          data.productTotal= data.products.qty*data.result.price
        }
        return data.productTotal
      
       })
       console.log(result);
      res.render('admin/order-details', { admin: true, layout: 'admin-layout', Order: true,order })
    })

  } catch (err) {
    next(err)
  }

})

// change order status
router.get('/changeStatus1/:id/:pid', verifyLogin, (req, res, next) => {
  try {
    let data = 'Placed'
    adminHelper.changeStatus(req.params.id, req.params.pid, data).then(() => {
      res.redirect('/admin/order-details')
    })
  } catch (err) {
    next(err)
  }
})

router.get('/changeStatus2/:id/:pid', verifyLogin, (req, res, next) => {
  try {
    let data = 'Shipped'
    adminHelper.changeStatus(req.params.id, req.params.pid, data).then(() => {
      res.redirect('/admin/order-details')
    })
  } catch (err) {
    next(err)
  }
})

router.get('/changeStatus4/:id/:pid', verifyLogin, (req, res, next) => {
  try {
    let data = 'Deliverd'
    adminHelper.changeStatus(req.params.id, req.params.pid, data).then(() => {
      res.redirect('/admin/order-details')
    })
  } catch (err) {
    next(err)
  }
})
router.get('/changeStatus5/:id/:pid', verifyLogin, (req, res, next) => {
  try {
    let data = 'Cancelled'
    adminHelper.changeStatusCancell(req.params.id, req.params.pid, data).then(() => {
      res.redirect('/admin/order-details')
    })
  } catch (err) {
    next(err)
  }
})
//  view products
router.get('/viewOrderProduct/:id/:pid', verifyLogin, async (req, res, next) => {
  try {
    let products = await adminHelper.getOrderProduct(req.params.id, req.params.pid)
    products[0].total=products[0].qty*products[0].product.price
    products[0].discount=(products[0].total*products[0]. delivaryAddress.discountPercentage)/100
    products[0].finaltotal=products[0].total- products[0].discount
    console.log(products);
    console.log('ppppppppppppppppppppppppppppppppppppppppppppppppppppppppp');
    
    res.render('admin/viewOrderProduct', { admin: true, layout: 'admin-layout', products })
  } catch (err) {
    next(err)
  }
})

// banner
router.get('/banner', function (req, res, next) {
  try {
    adminHelper.getBanner().then((banner) => {
      res.render('admin/banner', { admin: true, layout: 'admin-layout', banner: true, banner })
    })
  } catch (err) {
    next(err)
  }

});
router.get('/add-banner', (req, res) => {
  res.render('admin/add-banner', { admin: true, layout: 'admin-layout', banner: true })
})
router.post("/add-banner", (req, res, next) => {
  try {
    adminHelper.addBanner(req.body).then((id) => {
      let image = req.files.Image;
      image.mv('./public/banner-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/banner')
        } else { console.log(err) }
      })
    })
  } catch {
    next(err)
  }
})
router.get('/editbanner/:id', async (req, res, next) => {
  try {
    let bannerData = await adminHelper.getBannerDetails(req.params.id)
    res.render('admin/edit-banner', { layout: 'admin-layout', admin: true, banner: true, bannerData })
  } catch (err) {
    next(err)
  }
})
router.post('/editbanner/:id', (req, res, next) => {
  try {
    adminHelper.updateBanner(req.body, req.params.id).then(() => {
      if (req.files.Image) {
        let image = req.files.Image
        let id = req.params.id
        image.mv('./public/banner-images/' + id + '.jpg')
      }
      res.redirect('/admin/banner')
    })
  } catch (err) {
    next(err)
  }
})
router.get('/deletebanner/:id', (req, res, next) => {
  try {
    adminHelper.deleteBanner(req.params.id).then(() => {
      res.redirect('back')
    })
  } catch (err) {
    next(err)
  }
})

// coupon
router.get('/coupon', (req, res) => {
  adminHelper.getAllCoupon().then((coupon) => {
    res.render('admin/coupon', { layout: 'admin-layout', admin: true, coupon })
  })

})
router.get('/generate-coupon', (req, res) => {
  res.render('admin/generate-coupon', { layout: 'admin-layout', admin: true })
})
router.post('/generate-coupon', async(req, res) => {

  adminHelper.addCoupon(req.body).then((couponERR) => {
    if(couponERR){
      console.log(couponERR.err);
      res.render('admin/generate-coupon', { layout: 'admin-layout', admin:true,couponERR })
    }else{
      res.redirect('/admin/coupon')
    }
  })
})
router.get('/edit-coupon/:id',async(req,res)=>{
  let coupon = await adminHelper.getCoupon(req.params.id)
 
  // console.log(coupon.validity);
  // let date={}
  // date.year =parseInt(coupon.validity.slice(0, 4));
  // date.month =parseInt(coupon.validity.slice(5, 7));
  // date.day =parseInt(coupon.validity.slice(8, 10));
  // console.log(date);

  res.render('admin/edit-coupon', { layout: 'admin-layout', admin: true,coupon })
})
router.post('/edit-coupon/:id',(req,res)=>{
  adminHelper.updateCoupon(req.params.id,req.body).then(()=>{
    res.redirect('/admin/coupon')
  })
})
router.get('/delete-coupon/:id', (req, res) => {
  console.log(req.params);
  adminHelper.DeleteCoupon(req.params.id)
  res.redirect('/admin/coupon')
})


// logout
router.get('/loggout', function (req, res) {
  req.session.admin = null
  req.session.adminloggedIn = null
  res.redirect('/admin')
})
// ********
router.get('/*', function (req, res) {
  res.render('admin/errorPage', { layout: 'admin-layout' });
})
module.exports = router;
