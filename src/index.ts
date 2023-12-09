import { Context, Schema } from 'koishi'
import axios, { AxiosRequestConfig } from 'axios';  
import fetch from 'cross-fetch'; 

export const name = 'face-score'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('测颜值 [image:text]', '发送人像图片获取颜值评分').alias('/测颜值').action(
    async (_, message) => {
      //console.log("获取到信息"+message);
      
      //console.log(base64);
      if (message.includes('<image url="')){
        console.log("获取到待检测的图片");
      }
      else {
        console.log("未获取到待检测的图片");
        return "未获取到待检测的图片"
      }
      let base64 = await getImageAsBase64(getTextBetweenMarkers(message,'<image url="','"'));

      let cookie = await getRequestWithCookies('https://ux.xiaoice.com/beautyv3');
      let cookies = cookie.join(";");  //第一次访问，获取cookies
 
      let url = 'https://ux.xiaoice.com/api/image/UploadBase64?exp=0';  
      let data = base64;  
      let responseData = await sendPostRequest2({ url, data, cookies });  //第二次访问，上传图片，获取地址
      //let responseData = await sendPostRequest(url, data, cookies);
      console.log('Response data:', responseData); 

      let image_url = responseData.Host + responseData.Url;
      console.log('图片地址：',image_url)
      let MsgId = get13DigitTimestamp();
      let CreateTime = getFirstTenDigits(get13DigitTimestamp());
      let TraceId = getTextBetweenMarkers(cookies,'tid%22%3A%22','%22%7D');
      data = JSON.stringify({
        "MsgId":MsgId,
        "CreateTime":CreateTime,
        "TraceId":TraceId,
        "Content":{
          "imageUrl":image_url
        }
      });
      url = 'https://ux.xiaoice.com/api/imageAnalyze/Process?service=beauty'; 
      responseData = await sendPostRequest2({ url, data , cookies });  //第三次访问，获取识别结果
      //responseData = await sendPostRequest(url, data, cookies);
      console.log('Response data:', responseData); 
      if(responseData.content.metadata.FBR_Score0){
        return "得分："+responseData.content.metadata.FBR_Score0+"分。"+responseData.content.text;
      }
      else return "未检测到人像。"+responseData.content.text;
  }
  )
}


  
async function getImageAsBase64(imageUrl: string): Promise<string> { 
    try {  
      const config: AxiosRequestConfig = {  
        method: 'get',  
        url: imageUrl,  
        responseType: 'arraybuffer'  
      };  
        
      const response = await axios(config);  
        
      return response.data.toString('base64');  
    } catch (error) {  
      console.error('Error:', error);  
      throw error;  
    }   
}

export function getTextBetweenMarkers(str: string, marker1: string, marker2: string): string | null {  
  const index1 = str.indexOf(marker1);  
  if (index1 === -1) {  
      return null; // 如果找不到第一个标记，返回 null  
  }  

  const index2 = str.indexOf(marker2, index1 + marker1.length);  
  if (index2 === -1) {  
      return null; // 如果找不到第二个标记，返回 null  
  }  

  return str.slice(index1 + marker1.length, index2); // 返回两个标记之间的子字符串  
}

export function get13DigitTimestamp(): number {  
  const now = new Date();  
  return now.getTime();  
}

export function getFirstTenDigits(timestamp: number): number {  
  const strTimestamp = timestamp.toString();  
  const length = strTimestamp.length;  
  if (length < 10) {  
    throw new Error('Timestamp must be at least 10 digits long');  
  }  
  const firstTenDigits = parseInt(strTimestamp.slice(0, 10), 10);  
  return firstTenDigits;  
} 

// 定义一个函数，用于发送 GET 请求并将返回的 cookies 保存在变量中  
async function getRequestWithCookies(url: string): Promise<string[]> {  
  // 创建一个 Axios 实例  
  const instance = axios.create();  
  
  // 定义请求配置  
  const config: AxiosRequestConfig = {  
    url,  
    method: 'get',  
    responseType: 'text', // 指定返回数据的类型为 JSON  
  };  
  
  try {  
    // 发送 GET 请求  
    const response = await instance(config);  
    //console.log(response.data); // 输出返回的数据  
  
    // 将返回的 cookies 保存在变量中  
    const cookies = response.headers['set-cookie'];  
    console.log(cookies); // 输出保存的 cookies  
    return cookies;
  } catch (error) {  
    console.error(error); // 输出错误信息  
    return [];
  } finally {  
  }  
}  
  
async function sendPostRequest(url: string, data: any, cookies: any): Promise<any> {

  const options: AxiosRequestConfig = {
    method: 'post',
    url,
    data,
    headers: {
      'Content-Type':'application/json;charset=UTF-8', // 默认设置 Content-Type 为 application/json
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Connection':'keep-alive',
    },
    withCredentials: true, // 允许跨域携带 cookies
  };

  if (cookies) {
    options.headers['Cookie'] = cookies;
  }

  try {
    const response = await axios(options);
    //console.log(response);
    return response.data;
  } catch (error) {
    console.log('Error sending POST request:', error);
    throw error;
  }
}

export function excludeString(mainStr: string, excludeStr: string): string {  
  return mainStr.replace(new RegExp(excludeStr, 'g'), '');  
}  

interface PostRequestOptions {  
  url: string;  
  data: any;  
  cookies?: string;  
}  
  
async function sendPostRequest2({ url, data, cookies }: PostRequestOptions): Promise<any> {  
  try {  
    const options: RequestInit = {  
      method: 'POST',  
      headers: {  
      'Content-Type':'application/json;charset=UTF-8', // 默认设置 Content-Type 为 application/json
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },  
      body: data,  
    };  
  
    if (cookies) {  
      options.headers['Cookie'] = cookies;  
    }  
  
    const response = await fetch(url, options);  
    const responseBody = await response.json();  
    return responseBody;  
  } catch (error) {  
    console.error('Error sending POST request:', error);  
    throw error;  
  }  
}  
