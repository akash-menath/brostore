let db = require('../config/connection')
let collection = require('../config/collection')
const async = require('hbs/lib/async')
const { compare } = require('bcrypt')
const { user_collection } = require('../config/collection')
const { NumberContext } = require('twilio/lib/rest/pricing/v2/number')
const { disable } = require('../app')
let objectId = require('mongodb').ObjectId


module.exports = {
  dologin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })
  },
  blockUsers: (userId) => {
    console.log(userId);
    return new Promise((resolve, reject) => {
      try {
        db.get().collection(collection.user_collection).updateOne({ _id: objectId(userId) },
          {
            $set: {
              blockUsers: true
            }
          }).then(() => {
            resolve()
          })
      } catch (err) {
        reject(err)
      }
    })
  },
  unBlockUsers: (userId) => {
    return new Promise((resolve, reject) => {
      try {
        db.get().collection(collection.user_collection).updateOne({ _id: objectId(userId) },
          {
            $set: {
              blockUsers: false
            }
          }).then(() => {
            resolve()
          })
      } catch (err) {
        reject(err)
      }
    })
  },
  getOrderDetails: () => {
    return new Promise(async (resolve, reject) => {
      try {
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
            '$unwind': {
              'path': '$result'
            }
          },
          {
            '$addFields': {
                'Total': {
                    '$sum': {
                        '$multiply': [
                            '$products.qty','$delivaryAddress.totalAmount'
                        ]
                    }
                }
            }
        },
           {
            '$sort': {
              'delivaryAddress.time': -1
            }
          }
        ]).toArray()
        resolve(orderProduct)
      } catch (err) {
        reject(err)
      }
    })
  },
  // GetOrderDetails: () => {
  //   return new Promise(async (resolve, reject) => {
  //     try{
  //     let orderProduct = await db.get().collection(collection.Order_collection).aggregate(
  //       [
  //         {
  //           '$project': {
  //             '_id': 1, 
  //             'userId': 1,
  //             'delivaryAddress':1, 
  //             'paymentMethod': 1, 
  //             'status': 1, 
  //             'delivarystatus': 1, 
  //             'products': 1
  //           }
  //         }, {
  //           '$lookup': {
  //             'from': 'product', 
  //             'localField': 'products.item', 
  //             'foreignField': '_id', 
  //             'as': 'product'
  //           }
  //         }
  //       ]




  //     ).toArray()
  //     resolve(orderProduct)
  //     console.log(orderProduct);
  //   }catch(err){
  //     next(err)
  //   }
  //   })
  // },
  changeStatus: (orderId, proId, data) => {
    return new Promise((resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })

  },
  // cancell product
  changeStatusCancell: (orderId, proId, data) => {
    return new Promise((resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })

  },
  onlinePaymentCount: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = await db.get().collection(collection.Order_collection).find({ paymentMethod: "online" }).count()
        resolve(count)
      } catch (err) {
        reject(err)
      }

    })
  },
  totalUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = await db.get().collection(collection.user_collection).find().count()
        resolve(count)
      } catch (err) {
        reject(err)
      }
    })
  },
  totalOrder: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = await db.get().collection(collection.Order_collection).find().count()
        resolve(count)
      } catch (err) {
        reject(err)
      }
    })
  },
  cancelOrder: () => {
    return new Promise(async (resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }

    })
  },
  totalCOD: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = await db.get().collection(collection.Order_collection).find({ paymentMethod: "COD", }).count()
        resolve(count)
      } catch (err) {
        reject(err)
      }
    })
  },
  totalDeliveryStatus: (data) => {
    return new Promise(async (resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })
  },
  totalCost: () => {
    return new Promise(async (resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })
  },
  getOrderProduct: (orderId, proId) => {
    console.log(proId);
    return new Promise(async (resolve, reject) => {
      try {
        let orderItems = await db.get().collection(collection.Order_collection).aggregate([
          {
            $match: { _id: objectId(orderId) },
          }, {
            $unwind: '$products'
          }, {
            $project: {
              item: '$products.item',
              qty: '$products.qty',
              Status: '$products.Status',
              delivaryAddress: 1,
              paymentMethod: 1

            }
          }, {
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
              delivaryAddress: 1, paymentMethod: 1, item: 1, qty: 1, Status: 1, product: { $arrayElemAt: ['$product', 0] }

            }
          }

        ]).toArray()

        resolve(orderItems)
      } catch (err) {
        reject(err)
      }
    })

  },
  // banner
  addBanner: (data) => {
    return new Promise((resolve, reject) => {
      try {
        db.get().collection(collection.Banner_collection).insertOne({
          name: data.name,
          description: data.description,
          time: Date.now()
        }).then((response) => {

          console.log(response);
          resolve(response.insertedId)
        })
      } catch (err) {
        reject(err)
      }
    })
  },
  getBanner: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let banner = await db.get().collection(collection.Banner_collection).find().toArray()
        resolve(banner)
      } catch (err) {
        reject(err)
      }
    })

  },
  getBannerDetails: (bannerId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let bannerData = await db.get().collection(collection.Banner_collection).findOne({ _id: objectId(bannerId) })
        resolve(bannerData)
      } catch (err) {
        reject(err)
      }
    })
  },
  updateBanner: (data, bannerId) => {
    return new Promise((resolve, reject) => {
      try {
        db.get().collection(collection.Banner_collection).updateOne({ _id: objectId(bannerId) }, {
          $set: {
            name: data.name,
            description: data.description,
            time: Date.now()
          }



        }).then(() => {
          resolve()
        })
      } catch(err) {
        reject(err)
      }

    })
  },
  deleteBanner: (bannerId) => {
    return new Promise((resolve, reject) => {
      try {
        db.get().collection(collection.Banner_collection).deleteOne({ _id: objectId(bannerId) })
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  },
  getAllCoupon: () => {
    return new Promise(async (resolve, reject) => {
      try{
      let coupon = await db.get().collection(collection.COUPON_collection).find().sort({time:-1}).toArray()
      resolve(coupon)
      }catch(err){
        reject(err)
      }
    })
  },
  getCoupon:(CoupanId)=>{
    return new Promise((resolve,reject)=>{
      try{
      db.get().collection(collection.COUPON_collection).findOne({_id:objectId(CoupanId)}).then((response)=>{
        resolve(response)
      })
    }catch(err){
      reject(err)
    }
    })
  },

  addCoupon: (couponData) => {
    return new Promise(async(resolve,reject)=>{
      try{
      await   db.get().collection(collection.COUPON_collection).findOne({name:couponData.name}).then((data)=>{
     
          if(data){
              resolve({err:'Already Enterd'})
          }else{
            db.get().collection(collection.COUPON_collection).insertOne({
            name: couponData.name,
            offer: couponData.offer,
            validity: couponData.validity,
            time: Date.now()
          })
          resolve()  
          }
       
      })
    }catch(err){
      reject(err)
    }
     
  })

  },
    updateCoupon:(couponId,data)=>{
    return new Promise((resolve,reject)=>{
      try{
      db.get().collection(collection.COUPON_collection).updateOne({_id:objectId(couponId)},
      {
        $set:{
          name:data.name,
          offer:data.offer,
          validity:data.validity,
          time:Date.now()
        }
      }).then(()=>{
        resolve()
      })
    }catch(err){
      reject(err)
    }
    })
  },
  DeleteCoupon: (couponId) => {
    return new Promise(async (resolve, reject) => {
      try{
      db.get().collection(collection.COUPON_collection).deleteOne({ _id: objectId(couponId) }).then(() => {
        resolve()
      })
    }catch(err){
      reject(err)
    }
    })
  }


}