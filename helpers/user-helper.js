let db = require('../config/connection')
let collection = require('../config/collection')
const async = require('hbs/lib/async')
const bcrypt = require('bcrypt')
const { response } = require('../app')
const { Order_collection } = require('../config/collection')
let objectid = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { resolve } = require('path')
const { log } = require('console')
const { nextTick } = require('process')
require('dotenv').config()
var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEYID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = {
    doSingnup: (userData) => {
        return new Promise(async (resolve, reject) => {
            try{
            userData.blockUsers = false
            console.log(userData);
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.user_collection).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        }catch(err){
            next(err)
        }
        })
    },
    getalluser: () => {
        return new Promise(async (resolve, reject) => {
            try{
            let userdetails = await db.get().collection(collection.user_collection).find().sort({ name: 1 }).toArray()
            resolve(userdetails)
            }catch(err){
                next(err)
            }
        })
    },
    existinguser:(userData)=>{
      return new Promise(async(resolve,reject)=>{
        let user = await db.get().collection(collection.user_collection).findOne({ email: userData.email,phone:userData.phone})
        if(user){
            resolve({status:false})
        }else{
            resolve({status:true})
        }
      })
    },

    dologin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try{
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collection.user_collection).findOne({ email: userData.email, blockUsers: false })
            let userStatus = await db.get().collection(collection.user_collection).findOne({ email: userData.email, blockUsers: true })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("lig in sucess");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed');
                        resolve({ status: false })
                    }
                })
            } else if (userStatus) {
                response.blockStatus = true
                response.status = false
                resolve(response)
            } else {
                console.log('login failed');
                resolve({ status: false })
            }
        }catch(err){
            next()
        }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectid(proId),
            qty: 1,
            Status: 'pending',
            active: true
        }
        return new Promise(async (resolve, reject) => {
            try{
            let userCart = await db.get().collection(collection.cart_collection).findOne({ user: objectid(userId) })
            if (userCart) {
                let proexist = userCart.product.findIndex(product => product.item == proId)
                console.log(proexist);
                if (proexist != -1) {
                    db.get().collection(collection.cart_collection)
                        .updateOne({ user: objectid(userId), 'product.item': objectid(proId) },
                            {
                                $inc: { 'product.$.qty': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })

                } else {

                    db.get().collection(collection.cart_collection).updateOne({ user: objectid(userId) },
                        {

                            $push: {
                                product: proObj
                            }

                        }).then((response) => {
                            resolve()
                        })
                }

            } else {
                console.log("welcome ti ads");
                let cartObj = {
                    user: objectid(userId),
                    product: [proObj]
                }
                db.get().collection(collection.cart_collection).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        }catch(err){
            next(err)
        }
        })
    },
  
    // azad
    getAllCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let cartItems = await db.get().collection(collection.cart_collection).aggregate([
                {
                    $match: { user: objectid(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        qty: '$product.qty'
                    }
                },
                {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    '$addFields': {
                        'productTotal': {
                            '$sum': {
                                '$multiply': [
                                    '$qty', '$product.price'
                                ]
                            }
                        }
                    }
                }
            ]).toArray()
            console.log('ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd');
            console.log(cartItems);
            console.log('ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd');
            resolve(cartItems) 
        }catch(err){
            next(err)
        }
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let count = 0
            let cart = await db.get().collection(collection.cart_collection).findOne({ user: objectid(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        }catch(err){
            next(err)
        }
        })
    },
    deleteCartProduct: (CartId, proId, userId) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.cart_collection).updateOne({ _id: objectid(CartId) },
                {
                    $pull: {
                        product: { item: objectid(proId) }
                    }
                }).then((response) => {
                    resolve(response)

                })
            }catch(err){
                next(err)
            }
        })
    },

    changeProductQuandity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.Quantity);
        return new Promise((resolve, reject) => {
            try{
            if (details.count == -1 && details.quantity == 1) {
                console.log('remove');
                db.get().collection(collection.cart_collection)
                    .updateOne({ _id: objectid(details.cart) },
                        {
                            $pull: { product: { item: objectid(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })

            } else {
                console.log('update');
                db.get().collection(collection.cart_collection)
                    .updateOne({ _id: objectid(details.cart), 'product.item': objectid(details.product) },
                        {
                            $inc: { 'product.$.qty': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })

            }
        }catch(err){
            next(err)
        }
        })
    },
    getCartTotal: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let total = await db.get().collection(collection.cart_collection).aggregate([
                {
                    $match: { user: objectid(userId) },
                }, {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        qty: '$product.qty'
                    }
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }
                , {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }
                , {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$qty', '$product.price'] } }
                    }
                }

            ]).toArray()
            if (total.length == 0) {
                resolve(total)
            } else {
                resolve(total[0].total)
            }
        }catch(err){
            next(err)
        }


        })

    },
    //not needed
    // getCartEachProductTotal: (userId) => {
    //     return new Promise(async (resolve, reject) => {
    //         let sum = await db.get().collection(collection.cart_collection).aggregate([
    //             {
    //                 $match: { user: objectid(userId) },
    //             }, {
    //                 $unwind: '$product'
    //             }, {
    //                 $project: {
    //                     item: '$product.item',
    //                     qty: '$product.qty'
    //                 }
    //             }, {
    //                 $lookup: {
    //                     from: collection.product_collection,
    //                     localField: 'item',
    //                     foreignField: '_id',
    //                     as: 'product'
    //                 }
    //             }, {
    //                 $project: {
    //                     item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }

    //                 }
    //             }, {
    //                 $project: {
    //                     total: { $sum: { $multiply: ['$qty', '$product.price'] } }
    //                 }
    //             }

    //         ]).toArray()


    //         resolve(sum)
    //     })

    // },
    // wishlist
    addToWishlist: (proId, userId) => {
        let proObj = {
            item: objectid(proId),
        }
        return new Promise(async (resolve, reject) => {
            try{
            let userWishlist = await db.get().collection(collection.wishlist_collection).findOne({ user: objectid(userId) })
            if (userWishlist) {
                let proexist = userWishlist.product.findIndex(product => product.item == proId)
                if (proexist != -1) {
                    db.get().collection(collection.wishlist_collection).updateOne({ user: objectid(userId) },{
                        $pull:{product:{item:objectid(proId)}

                        }
                    })
                    resolve({login:true})

                } else {

                    db.get().collection(collection.wishlist_collection).updateOne({ user: objectid(userId) },
                        {

                            $push: {
                                product: proObj
                            }

                        }).then((response) => {
                            resolve({login:true,status:true})
                        })
                }

            } else {
                let cartObj = {
                    user: objectid(userId),
                    product: [proObj]
                }
                db.get().collection(collection.wishlist_collection).insertOne(cartObj).then((response) => {
                    resolve({login:true,status:true})
                })
            }
        }catch(err){
            next(err)
        }

        })
    },
    getAllWishlistProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let cartItems = await db.get().collection(collection.wishlist_collection).aggregate([
                {
                    $match: { user: objectid(userId) },
                }, {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        qty: '$product.qty'
                    }
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        item: 1, qty: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
            resolve(cartItems)
        }catch(err){
            next(err)
        }
        })
    },
    getWishlistCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let count = 0
            let wishlist = await db.get().collection(collection.wishlist_collection).findOne({ user: objectid(userId) })
            if (wishlist) {
                count = wishlist.product.length
            }
            resolve(count)
        }catch(err){
            next(err)
        }
        })
        
    },
    deleteWishlistProduct: (CartId, proId, userId) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.wishlist_collection).updateOne({ _id: objectid(CartId) },
                {
                    $pull: {
                        product: { item: objectid(proId) }
                    }
                }).then((response) => {
                    resolve(response)

                })
            }catch(err){
                next(err)
            }
        })
    },
    getProductCategory: (Category) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.product_collection).find({ category: Category }).toArray().then((data) => {
                resolve(data)
            })
        }catch(err){
            next(err)
        }
        })
    },
    getMenProduct: () => {
        return new Promise(async (resolve, reject) => {
            try{
            await db.get().collection(collection.product_collection).find({ category: "men" }).toArray().then((product) => {
                resolve(product)
            })
        }catch(err){
            next(err)
        }
        })
    },
    getWomenProduct: () => {
        return new Promise(async (resolve, reject) => {
            try{
            await db.get().collection(collection.product_collection).find({ category: "women" }).toArray().then((product) => {
                resolve(product)
            })
        }catch(err){
            next(err)
        }
        })
    },
    // get cart product
    
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            products = await db.get().collection(collection.cart_collection).findOne({ user: objectid(userId) })
            resolve(products)
            }catch(err){
                next(err)
            }
        })

    },
    placeOrder: (order,products,totalPrice,address) => {

        return new Promise((resolve, reject) => {
            try{
            let orderStatus = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObject = {
                delivaryAddress: {
                    name:address.name,
                    state:address.State,
                    address:address.Address,
                    totalAmount: parseInt(totalPrice),
                    city:address.City,
                    pincode:address.Pincode,
                    phone:address.phone,
                    email:address.email,
                    date:new Date().toLocaleString(),
                    time:Date.now()
                },
                userId: objectid(order.userId),
                paymentMethod: order['payment-method'],
                status: orderStatus,
                delivarystatus: 'pending',
                products: products
            }
            db.get().collection(collection.Order_collection).insertOne(orderObject).then((response) => {
                db.get().collection(collection.cart_collection).deleteOne({ user: objectid(order.userId) })

                // for (i = 0; i < products.length; i++) {
                //     db.get().collection(collection.product_collection).updateOne({ _id: objectid(products[i].item) }, {
                //         $inc: { stock: -products[i].qty }
                //     })
                // }
                resolve(response.insertedId)
                console.log("oderplaced");
                console.log(response.insertedId);

            })
        }catch(err){
            next(err)
        }

        })

    },
    getAllOrderList: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let orderProduct = await db.get().collection(collection.Order_collection).aggregate([

                {
                    '$match': {
                        'userId': new objectid(userId)
                    }
                }, {
                    '$unwind': {
                        'path': '$products'
                    }
                }, {
                    '$lookup': {
                        'from': 'product',
                        'localField': 'products.item',
                        'foreignField': '_id',
                        'as': 'result'
                    }
                }, {
                    $unwind: {
                        'path': '$result',
                    }
                },{
                    $sort:{
                        'delivaryAddress.time':-1

                    }
                }


            ]).toArray()
            console.log('cheking irder products');
            console.log(orderProduct);
            resolve(orderProduct)
        }catch(err){
            next(err)
        }
        })
    },
    /////////////////////////////////////////////////////////////////////////////
    getOrderProducts: (orderId,proId) => {
        console.log(proId);
        return new Promise(async (resolve, reject) => {
            try{
            let orderItems = await db.get().collection(collection.Order_collection).aggregate([
                {
                    $match: { _id: objectid(orderId) },
                }, {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        qty: '$products.qty',
                        Status:'$products.Status',
                        delivaryAddress:1,
                        paymentMethod:1

                    }
                },{
                    $match: { item: objectid(proId) },
                }, {
                    $lookup: {
                        from: collection.product_collection,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        delivaryAddress:1, paymentMethod:1, item: 1, qty: 1,Status:1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()

            resolve(orderItems)
        }catch(err){
            next(err)
        }
           
        })
    },
    // cancel order
    cancelOrder: (usersId, proId) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.Order_collection).updateOne({ userId: objectid(usersId), 'products.item': objectid(proId) },
                {
                    $set: {
                        'products.$.Status': 'Cancelled',
                        'products.$.active': false
                    }
                }
            ).then(() => {
                resolve()
            })
        }catch(err){
            next(err)
        }
        })

    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            try{
            var options = {
                amount: total,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                   
                    resolve(order)
                }

            });
        }catch(err){
            next(err)
        }

        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            try{
            var crypto = require("crypto");
            let hmac = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex');
            console.log(hmac);
            console.log(details['payment[razorpay_signature]']);
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }


        }catch(err){
            next(err)
        }

        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.Order_collection)
                .updateOne({ _id: objectid(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }).then(() => {
                        resolve()
                    })
                }catch(err){
                    next(err)
                }
        })
    },
    getUserDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let userDetails= await db.get().collection(collection.user_collection).findOne({_id: objectid(userId)})
            resolve(userDetails)
            }catch(err){
                next(err)
            }
        })
    },
    // addressssssssssssssss
    addAddress: (userId, data) => {
        
        let addressId = new objectid()
        data.adressId = addressId,
        data.date= Date.now()
        return new Promise(async (resolve, reject) => {
            try{
          let userData=await db.get().collection(collection.user_collection).findOne({_id:objectid(userId)})
          if(userData.address){
            db.get().collection(collection.user_collection).updateOne({_id:objectid(userId)}, {
                $push: {
                    address: data,
                }
            }).then((response) => {
                resolve(response)
            })
        
          }else{
            db.get().collection(collection.user_collection).updateOne({_id:objectid(userId)},{
                $set:{address:[data]}
            }).then((response)=>{
                resolve(response)
            })
          }
        }catch(err){

        }
            })
    },
    getAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let address = await db.get().collection(collection.user_collection).aggregate([
                {
                  $match: {
                    _id:objectid(userId)
                  }
                }, {
                  $unwind: {
                    path: '$address'
                  }
                }, {
                  $project: {
                    address: 1
                  }
                }, {
                  $sort: {
                    date: -1
                  }
                }
              ]).toArray()
         address=address.slice(-3)
            resolve(address)
            }catch(err){
                next(err)
            }
        })
    },
    getDelivaryAddress: (userId,addressId) => {
        return new Promise(async (resolve, reject) => {
            try{
            let address = await db.get().collection(collection.user_collection).aggregate([
                {
                  $match: {
                    _id:objectid(userId)
                  }
                }, {
                  $unwind: {
                    path: '$address'
                  }
                }, {
                  $match: {
                    'address.adressId':objectid(addressId)
                  }
                }, {
                  $project: {
                    address: 1
                  }
                }
              ]).toArray()    
                resolve(address[0].address)
            }catch(err){
                next(err)
            }
              
            
        })
    },
    searchProducts:(data)=>{
        return new Promise(async(resolve,reject)=>{
            sarchProduct=await db.get().collection(collection.product_collection).find({
                '$or':[
                    {name:{$regex:data,$options:'i'}},
                    {category:{$regex:data,$options:'i'}},
                    {Price:{$regex:data,$options:'i'}}

                ]

            }).toArray()
            resolve(sarchProduct)
            

        
        })
    },
    //forgot otp
    getPhone:(Email)=>{
      return new Promise(async(resolve,reject)=>{
        try{
    let userData=await db.get().collection(collection.user_collection).findOne({email:Email})
    if(userData){
        resolve(userData)
    }else{
        resolve({otpErr:'Invalid Email Address'})
    }
        }catch(err){
            next(err)
        }
    
      })
    },
    // change passwaprd
      updatePassword:(password,Email)=>{
        return new Promise(async(resolve,reject)=>{
            try{
            let Password=await bcrypt.hash(password.password, 10)
            db.get().collection(collection.user_collection).updateOne
            ( {email:Email.email},{
                $set:{
                    password:Password
                }
            }).then(()=>{
                resolve(response)
            })
        }catch(err){next(err)}
        })

    }
}
