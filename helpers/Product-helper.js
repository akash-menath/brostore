let db=require('../config/connection')
let collection=require('../config/collection')
const { ObjectId } = require('mongodb')
const { NetworkContext } = require('twilio/lib/rest/supersim/v1/network')

module.exports={
    addproduct:(product)=>{
        let time=Date.now()
        return new Promise((resolve,reject)=>{
            try{
            db.get().collection(collection.product_collection).insertOne({
                name:product.name,
                description:product.description,
                price:parseInt(product.price),
                category:product.category,
                stock:parseInt(product.stock),
                time:time
            }).then((data)=>{

                resolve(data.insertedId)
            })
        }catch(err){
          reject(err)
        }
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.product_collection).find().sort({time:-1}).toArray()
            resolve(products)
        })
    },
    
        getProductDetails:(productId)=>{
            return new Promise((resolve ,reject)=>{
               db.get().collection(collection.product_collection).findOne({_id:ObjectId(productId)}).then((product)=>{
                resolve(product)
               })
            })
        },
        deleteProduct:(id)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.product_collection).deleteOne({_id:ObjectId(id)}).then((response)=>{
                    console.log(response);
                    resolve(response)
                })
            
            })
        },
        upDateProduct:(protId,proDetails)=>{
            return new Promise((resolve,reject)=>{
                try{
                let time=Date.now()
                db.get().collection(collection.product_collection).updateOne({_id:ObjectId(protId)}
                ,{
                    $set:{
                        name:proDetails.name,
                        description:proDetails.description,
                        price:parseInt(proDetails.price),
                        category:proDetails.category,
                        stock:parseInt(proDetails.stock),
                        time:time

                    }
                }).then((response)=>{
                    resolve()
                })
            }catch(err){
                reject(err)
            }
            })
        },      
        getAProduct:(proId)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.product_collection).findOne({_id:ObjectId(proId)}).then((product)=>{
                    resolve(product)
                }).catch((err)=>{
                    reject(err)
                })
            })
        },
        addcatogory:(catogory)=>{
           
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.catogory_collection).findOne(catogory).then((data)=>{
                    if(data){
                        resolve({err:'Already Enterd'})
                    }else{
                        db.get().collection(collection.catogory_collection).insertOne(catogory).then((data)=>{
                            resolve()
                        })
                    }
                })
               
            })
        },
        getCatogory:()=>{
            return new Promise(async(resolve,reject)=>{
                let catogory=await db.get().collection(collection.catogory_collection).find().toArray()
                resolve(catogory)
            })
        },
        deletecatogory:(id)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.catogory_collection).deleteOne({_id:ObjectId(id)}).then((response)=>{
                    console.log(response);
                    resolve(response)
                })
            
            })
        },
        getAllCategory:()=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.catogory_collection).find().toArray().then((data)=>{
                    resolve(data)
                })
            })
        }

        
    }
