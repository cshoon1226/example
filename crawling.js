const _url = "https://etherscan.io/labelcloud";
const webdriver = require('selenium-webdriver');
const {By,Util} = webdriver;
var fs = require('fs');

var driver = new webdriver.Builder()
.forBrowser('chrome')
.build();

//account들의 주소를 저장할 배열
var accountList = new Array();
//token들의 주소를 저장할 배열
var tokenList = new Array();
var flag;

async function geturl(){
  try{
    await driver.get(_url);
    await driver.manage().window().maximize();
    await driver.executeScript("window.scrollTo(0,4000)");

    await driver.findElements(By.className('col-md-4 col-lg-3 mb-3 secondary-container')).then(async function(list){
      accountList=[];
      tokenList=[]
      //각 라벨에 대해서 클릭이 가능하도록 화면 조정
      for(var i=0;i<list.length;i++){
        if(i==48 || i==96 || i==144 || i==192 || i==240){
          await driver.executeScript("window.scrollTo(0,4000)");
        }

        //라벨을 클릭하여 accounts항목과 tokens항목이 있으면 플래그를 통해 주소를 리스트에 저장
        await list[i].findElement(By.className('btn btn-sm btn-block btn-custom btn-custom-toggle dropdown-toggle')).click();
        await list[i].findElements(By.className('py-1 px-3 d-block')).then(async function(el){
          for(var j=0;j<el.length;j++){
            flag=0;
            await el[j].getText().then(async function(text){
              var element = text.split(' ');
              if(element[0]=='Accounts'){
                flag=1;
              }
              else if(element[0]=='Tokens'){
                flag=2;
              }
            })

            await el[j].getAttribute('href').then(async function(href){
              if(flag==1){
                await accountList.push(href);
              }
              else if(flag==2){
                await tokenList.push(href);
              }
            })
          }
        })
      }
    })
  } finally{
    //await driver.quit();
  }
}

async function account(){

  try{
    for(var i=0;i<accountList.length;i++){
      if(i==87){//Liqui.io 라벨에 대해서 거름
        continue;
      }

      var flag=0;
      var filename;
      //json파일에 저장하기 위한 변수
      var obj = {
        name:"",
        accounts:[],
        tokens:[]
      };

      //accountList에 저장되어 있는 주소로 이동
      await driver.get(accountList[i]);
      //라벨에 있는 주소의 개수를 확인하여 25개 이상일 경우 항목을 100씩 보게함
      try{
        await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div[2]/div/div[1]/p')).then(async function(numtext){
          await numtext.getText().then(async function(num){
            var n=num.split(' ');
            if(n[3]>25 || n[3].length>2){
              await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_ddlRecordsPerPage"]/option[4]')).then(async function(opt){
                await opt.click();
              })
            }
          })
        })
      } catch(e){
        await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div/div/div[1]/p')).then(async function(numtext){
          await numtext.getText().then(async function(num){
            var n=num.split(' ');
            if(n[3]>25 || n[3].length>2){
              await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_ddlRecordsPerPage"]/option[4]')).then(async function(opt){
                await opt.click();
              })
            }
          })
        })
      }

      //주소들이 총 몇페이지로 저장되어있는지 확인
      //2페이지 이상일 경우 maxpage까지 이동하며 주소 수집
      let maxpage;
      try{
        maxpage = await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div[2]/div/div[1]/nav/ul/li[3]/span/strong[2]')).getText();
      } catch(e){
        try{
          maxpage = await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div/div/div[1]/nav/ul/li[3]/span/strong[2]')).getText();
        } catch(e){
          maxpage=1;
        }
      }

      //라벨의 이름을 확인하여 파일이름을 저장
      await driver.findElement(By.xpath('//*[@id="content"]/div[1]/div[1]/div/h1')).getText().then(async function(te){
        var str = te.split(' ');
        filename = te.substring(9,te.length);
        if(str[2]=='/'){
          filename = str[1]+' '+str[3];
        }
        obj.name=filename;
        filename+='.json';
      })

      //주소를 수집하는 부분
      //주소가 하나도 없는 라벨은 걸러준다
      for(var j=0;j<maxpage;j++){
        await driver.findElement(By.css('#content > div.container.space-bottom-2 > div.card > div > div.table-responsive.mb-2.mb-md-0 > table > tbody')).then(async function(tbody){
          await tbody.findElements(By.tagName('tr')).then(async function(tr){
            for(var k=0;k<tr.length;k++){
              try{
                await tr[k].findElement(By.tagName('td')).then(async function(td){
                  await td.getText().then(async function(text){
                    if(text[0]=='0'){
                      await obj.accounts.push(text);
                      flag=1;
                    }
                  })
                })
              } catch(e){}
            }
          })
        })
        //maxpage가 2 이상인 경우 다음 페이지로 넘어가는 부분
        if(j!=maxpage-1){
          try{
            await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div[2]/div/div[1]/nav/ul/li[4]/a')).click();
          } catch(e){
            await driver.findElement(By.xpath('//*[@id="content"]/div[3]/div/div/div[1]/nav/ul/li[4]/a')).click();
          }
        }
      }
      //주소가 있는 라벨의 경우 json파일에 저장한다.
      if(flag==1){
        var json=JSON.stringify(obj);
        fs.writeFileSync(filename,json);
      }
    }
  } finally{
    //await driver.quit();
  }
}

async function token(){

  try{
    for(var i=0;i<tokenList.length;i++){
      if(i==159){//페이지 오류가 있는 라벨을 무시
        continue;
      }
      var filename;
      //json파일이 존재하는 경우 데이터를 받아오는 변수
      var data;
      //json파일이 존재하지 않는 경우 주소를 저장할 변수
      var obj = {
        name:"",
        accounts:[],
        tokens:[]
      };

      //tokenList에 저장되어 있는 주소로 이동
      await driver.get(tokenList[i]);

      //라벨에 있는 주소의 개수를 확인하여 50개 이상일 경우 항목을 100씩 보게함
      try{
        await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_divpagingpanel"]/p/strong')).then(async function(numtext){
          await numtext.getText().then(async function(num){
            if(num>50){
              await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_ddlRecordsPerPage"]/option[4]')).then(async function(opt){
                await opt.click();
              })
            }
          })
        })
      } catch(e){}

      //주소들이 총 몇페이지로 저장되어있는지 확인
      //2페이지 이상일 경우 maxpage까지 이동하며 주소 수집
      let maxpage;
      try{
        maxpage = await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_divpagingpanel"]/nav/ul/li[3]/span/strong[2]')).getText();
      } catch(e){
        maxpage=1;
      }

      //라벨의 이름을 확인하여 파일이름을 저장
      //파일이 존재하는 경우 데이터를 받아옴
      await driver.findElement(By.xpath('//*[@id="content"]/div[1]/div[1]/div/h1')).getText().then(async function(te){
        var str = te.split(' ');
        filename = te.substring(14,te.length);
        if(str[3]=='/'){
          filename = str[2]+' '+str[4];
        }
        obj.name=filename;
        filename+='.json';
        fs.exists(filename, function(exists){
          if(exists){
            data=fs.readFileSync(filename,'utf8');
            obj=JSON.parse(data);
          }
        })
      })

      //주소를 수집하는 부분
      for(var j=0;j<maxpage;j++){
        await driver.findElement(By.css('#ContentPlaceHolder1_divSearchResult > table > tbody')).then(async function(tbody){
          await tbody.findElements(By.tagName('tr')).then(async function(tr){
            for(var k=0;k<tr.length;k++){
              try{
                await tr[k].findElement(By.className('d-block')).then(async function(td){
                  await td.getText().then(async function(text){
                    await obj.tokens.push(text);
                  })
                })
              } catch(e){}
            }
          })
        })
        //maxpage가 2 이상인 경우 다음 페이지로 넘어가는 부분
        if(j!=maxpage-1){
          await driver.findElement(By.xpath('//*[@id="ContentPlaceHolder1_divpagingpanel"]/nav/ul/li[4]/a')).click();
        }
      }
      //수집한 주소들을 json파일에 저장한다.
      var json=JSON.stringify(obj);
      fs.writeFileSync(filename,json);
    }
  } finally{
    //주소 수집이 모두 끝나고 크롬창을 닫아준다.
    await driver.quit();
  }
}

async function main(){
  await geturl();
  await account();
  await token();
}

main();
