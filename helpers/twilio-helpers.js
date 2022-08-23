require('dotenv').config()

const client = require('twilio')(process.env.TWILIO_ACCOUNT_ID,process.env.TWILIO_AUTH_TOCKEN);
const serviceSid=process.env.TWILIO_SERVICE_SID


             module.exports={
                   dosms:(noData)=>{
                    let res={}
                    return new Promise(async(resolve,reject)=>{
                        try{
                            console.log('hello');
                       await client.verify.services(serviceSid).verifications.create({
                            to :`+91${noData.phone}`,
                            channel:"sms"
                        }).then((res)=>{
                            res.valid=true;
                            resolve(res)
                            console.log(res);
                        })
                    }catch(err){
                        reject(err)
                    }
                    })
                },
                otpVerify:(otpData,nuData)=>{
                    let resp={}
                    return new Promise(async(resolve,reject)=>{
                        try{
                       await client.verify.services(serviceSid).verificationChecks.create({
                            to:   `+91${nuData.phone}`,
                            code:otpData.otp
                        }).then((resp)=>{
                            console.log("verification success");
                            console.log(resp);
                            resolve(resp)
                        })
                    }catch(err){
                        reject(err)
                    }
                    })
                }

             }