const _url = "https://etherscan.io/accounts/label/0xuniverse";
const webdriver = require('selenium-webdriver');
const {By,Util} = webdriver;
var fs = require('fs');

var driver = new webdriver.Builder()
.forBrowser('chrome')
.build();

async function example(){
  try{
    await driver.get(_url);
    await driver.manage().window().maximize();

    await driver.findElement(By.id('content'));
    await driver.getPageSource().then(async function(tt){
      var text = tt.split('<');
      for(var i=0;i<text.length;i++){
        if(text[i].indexOf('a')!=-1 && text[i].indexOf('address')!=-1){
          await console.log(text[i]);
        }
      }
    })

  } finally {
    await driver.quit();
  }
}

async function main(){
  await example();
}

main();
