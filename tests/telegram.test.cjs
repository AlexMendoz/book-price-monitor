const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.TELEGRAM_BOT_TOKEN='test-token';process.env.TELEGRAM_CHAT_ID='test-chat';
const {sendTelegramMessage}=require('../src/services/telegramService.ts');
const {telegramSendMessage}=require('../src/services/telegramBotApi.ts');
test('job and bot share transport and long messages retain markup only on final chunk',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})};};
 try{
  await sendTelegramMessage({text:'<b>Test</b>'});
  assert.equal(calls[0].chat_id,'test-chat');
  const text=Array.from({length:100},()=>'<b>'+ 'a'.repeat(70) +'</b>').join('\n');
  await telegramSendMessage({chatId:'bot',text,replyMarkup:{inline_keyboard:[]}});
  assert.ok(calls.length>2);
  assert.ok(calls.slice(1).every(c=>c.text.length<=3500));
  assert.equal(calls[1].reply_markup,undefined);
  assert.deepEqual(calls.at(-1).reply_markup,{inline_keyboard:[]});
 }finally{global.fetch=original;}
});
