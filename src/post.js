const ABIBBS = [{"constant":!1,"inputs":[{"name":"content","type":"string"}],"name":"Post","outputs":[],"payable":!1,"stateMutability":"nonpayable","type":"function"},{"anonymous":!1,"inputs":[{"indexed":!1,"name":"content","type":"string"}],"name":"Posted","type":"event"}]
const ABIBBSExt = [{"constant":false,"inputs":[{"name":"origin","type":"bytes32"},{"name":"vote","type":"uint256"},{"name":"content","type":"string"}],"name":"Reply","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"origin","type":"bytes32"},{"indexed":false,"name":"vote","type":"uint256"},{"indexed":false,"name":"content","type":"string"}],"name":"Replied","type":"event"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"downvotes","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"upvotes","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"bytes32"}],"name":"voted","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"}]

const BBSContract = "0x663002C4E41E5d04860a76955A7B9B8234475952"
const BBSExtContract = "0xca107a421f3093cbe28a2a7b4fce843931613bcd"

const web3js = new Web3('https://mainnet-rpc.dexon.org')
let dexonWeb3 = ''
let activeAccount = ''

function convert(str) {
  let tmp='', count = 0;
  for(i=0;i<str.length; i++){
    if (str[i].match(/[\u4e00-\u9fa5]/g)) tmp+=str[i],count+=2
    else if (str[i].match(/[\u0800-\u4e00]/g)) tmp+=str[i],count+=2
    else if (str[i].match(/[\uff00-\uffff]/g)) tmp+=str[i],count+=2
    else tmp+=str[i],count++

    if (count >= 40) break
  }
  return tmp
}

function check(){
  $("#bbs-post")[0].disabled = ( $("#bbs-content")[0].value.length>0 && $("#bbs-title")[0].value >0 ) ? false : true
}


function main(){
  // String.prototype.lines = function() { return this.split(/\r*\n/); }
  // String.prototype.lineCount = function() { return this.lines().length; }

  $("#bbs-title")[0].onblur = () => { check(), $("#bbs-title")[0].value = convert($("#bbs-title")[0].value) }
  $("#bbs-content")[0].onkeyup = () => { check() }
  $("#bbs-content")[0].placeholder="~\n".repeat(20)
  $("#bbs-post")[0].onclick = () => { newPost($("#bbs-title")[0].value, $("#bbs-content")[0].value)}
  $("#bbs-cancel")[0].onclick = () => { window.location = 'index.html'}
  initDexon()
}

function newPost(title, content) {
  if (dexonWeb3 === ''){
    alert('Please connect to your DEXON Wallet.')
    return
  }

  if (title.length > 40) {
    alert('Title\'s length is over 40 characters.')
    return
  }

  const post = '[' + title + ']' + content
  const dexBBSExt = new dexonWeb3.eth.Contract(ABIBBSExt, BBSExtContract)
  dexBBSExt.methods.Post(post).send({ from: activeAccount })
  .then(receipt => {
    window.location = 'index.html'
  })
  .catch(err => {
    alert(err)
  })
}


function startInteractingWithWeb3() {
  setInterval(() => {
    dexonWeb3.eth.getAccounts().then(([account]) => {
      activeAccount = account
      $("#bbs-user")[0].innerHTML = activeAccount.replace(/^(0x.{4}).+(.{4})$/, '$1...$2')
    })
  }, 1000)
}

function initDexon() {
  if (window.dexon) {
    const dexonProvider = window.dexon
    dexonProvider.enable()
    dexonWeb3 = new Web3()
    dexonWeb3.setProvider(dexonProvider)

    dexonWeb3.eth.net.getId().then(networkID => {
      if (networkID === 237) {
        startInteractingWithWeb3()
        console.log('DEXON Wallet connected')
      }
      else
        alert('Wrong network')
    })
  }
  else {
    alert('DEXON Wallet not detected. (請安裝 DEXON 瀏覽器擴充套件)')
    window.location = 'index.html'
  }
}


$(main())

