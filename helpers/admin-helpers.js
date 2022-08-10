let db = require('../config/connection')
let collection = require('../config/collection')
const async = require('hbs/lib/async')
const { compare } = require('bcrypt')
const { user_collection } = require('../config/collection')
const { NumberContext } = require('twilio/lib/rest/pricing/v2/number')
let objectId = require('mongodb').ObjectId


module.exports = {
  dologin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      try{
      let loginstatus = false
      let response = {}
      let admin = await db.get().collection(collection.admin_collection).findOne({ email: adminData.email })
      if (admin) {
        if (adminData.password == admin.password) {
          console.log('admin login sucess');
          response.admin = admin
          response.status = true
          resolve(response)
        } else {
          console.log('admin password rong');
          resolve({ status: false })

        }



      } else {
        console.log('admin email not currect');
        resolve({ status: false })

      }
    }catch(err){
      next(err)
    }
    })
  },
  blockUsers: (userId) => {
    console.log(userId);
    return new Promise((resolve, reject) => {
      try{
      db.get().collection(collection.user_collection).updateOne({ _id: objectId(userId) },
        {
          $set: {
            blockUsers: true
          }
        }).then(() => {
          resolve()
        })
      }catch(err){
        next(err)
      }
    })
  },
  unBlockUsers: (userId) => {
    return new Promise((resolve, reject) => {
      try{
      db.get().collection(collection.user_collection).updateOne({ _id: objectId(userId) },
        {
          $set: {
            blockUsers: false
          }
        }).then(() => {
          resolve()
        })
      }catch(err){
        next(err)
      }
    })
  },
  getOrderDetails: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let orderProduct = await db.get().collection(collection.Order_collection).aggregate([

        {
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
        }


      ]).toArray()
      resolve(orderProduct)
    }catch(err){
      next(err)
    }
    })
  },
  changeStatus: (orderId, proId, data) => {
    return new Promise((resolve, reject) => {
      try{
      db.get().collection(collection.Order_collection).updateOne({ _id: objectId(orderId), 'products.item': objectId(proId) },
        {
          $set: {
            'products.$.Status': data,
            'products.$.active': true
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
  // cancell product
  changeStatusCancell: (orderId, proId, data) => {
    return new Promise((resolve, reject) => {
      try{
      db.get().collection(collection.Order_collection).updateOne({ _id: objectId(orderId), 'products.item': objectId(proId) },
        {
          $set: {
            'products.$.Status': data,
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
  onlinePaymentCount: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let count = await db.get().collection(collection.Order_collection).find({ paymentMethod: "COD" }).count()
      resolve(count)
      }catch(err){
        next(err)
      }

    })
  },
  totalUsers: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let count = await db.get().collection(collection.user_collection).find().count()
      resolve(count)
      }catch(err){
        next(err)
      }
    })
  },
  totalOrder: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let count = await db.get().collection(collection.Order_collection).find().count()
      resolve(count)
      }catch(err){
        next(err)
      }
    })
  },
  cancelOrder: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let count = await db.get().collection(collection.Order_collection).aggregate([
        {
          $match: {
            delivarystatus: "pending"
          }
        },

        {
          $unwind: {
            path: '$products'
          }
        }, {
          $match: {
            'products.Status': 'Cancelled'
          }
        }, {
          $count: 'number'
        }

      ]).toArray()
      resolve(count)
    }catch(err){
      next(err)
    }

    })
  },
  totalCOD: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let count = await db.get().collection(collection.Order_collection).find({ paymentMethod: "COD", }).count()
      resolve(count)
      }catch(err){
        next(err)
      }
    })
  },
  totalDeliveryStatus: (data) => {
    return new Promise(async (resolve, reject) => {
      try{
      let statusCount = await db.get().collection(collection.Order_collection).aggregate([
        {
          $match: {
            delivarystatus: "pending"
          }
        },

        {
          $unwind: {
            path: '$products'
          }
        }, {
          $match: {
            'products.Status': data

          }
        }, {
          $count: 'number'
        }

      ]).toArray()
      resolve(statusCount)
    }catch(err){
      next()
    }
    })
  },
  totalCost: () => {
    return new Promise(async (resolve, reject) => {
      try{
      total = await db.get().collection(collection.Order_collection).aggregate([
        {
          $match: {
            delivarystatus: "pending"
          }
        },

        {
          $project: {
            'delivaryAddress.totalAmount': 1
          }
        },
        {
          $group: {
            _id: null,
            sum: { $sum: '$delivaryAddress.totalAmount' }
          }
        }
      ]).toArray()
      resolve(total)
    }catch(err){
      next(err)
    }
    })
  },
  getOrderProduct: (orderId,proId) => {
    console.log(proId);
    return new Promise(async (resolve, reject) => {
      try{
        let orderItems = await db.get().collection(collection.Order_collection).aggregate([
            {
                $match: { _id: objectId(orderId) },
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
                $match: { item: objectId(proId) },
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
// banner
addBanner:(data)=>{
  return new Promise((resolve,reject)=>{
    try{
    db.get().collection(collection.Banner_collection).insertOne({
        name:data.name,
        description:data.description,
        time:Date.now()
    }).then((response)=>{
    
     console.log(response);
      resolve(response.insertedId)
    })
  }catch(err){
    next(err)
  }
  })
},
getBanner:()=>{
  return new Promise(async(resolve,reject)=>{
    try{
    let banner=await db.get().collection(collection.Banner_collection).find().toArray()
      resolve(banner)
    }catch(err){
      next(err)
    }
  })

},
getBannerDetails:(bannerId)=>{
  return new Promise(async(resolve,reject)=>{
    try{
  let bannerData=await  db.get().collection(collection.Banner_collection).findOne({_id:objectId(bannerId)})
  resolve(bannerData)
    }catch(err){
      next(err)
    }
  })
},
updateBanner:(data,bannerId)=>{
  return new Promise((resolve,reject)=>{
    try{
  db.get().collection(collection.Banner_collection).updateOne({_id:objectId(bannerId)},{
    $set:{
      name:data.name,
      description:data.description,
      time:Date.now()
    }
    

      
  }).then(()=>{
    resolve()
  })
}catch{
  next(err)
}
  
})
},
deleteBanner:(bannerId)=>{
  return new Promise((resolve,reject)=>{
    try{
    db.get().collection(collection.Banner_collection).deleteOne({_id:objectId(bannerId)})
    resolve()
    }catch(err){
      next(err)
    }
  })
}


}