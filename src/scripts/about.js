import {parseUser} from './utils.js'
import Dexon from './dexon.js'

let account = ''

const render = (_account) => {
  account = _account

  if (account){
    // show User
    $("#bbs-login").hide()
    $("#bbs-register").hide()
    $("#bbs-user-menu").show()
  }
  else{
    // show Login/Register
    $("#bbs-login").show()
    $("#bbs-register").show()
    $("#bbs-user-menu").hide()
  }

  $("#bbs-user").text(parseUser(account))
}

const main = async () => {
  const dexon = new Dexon(window.dexon)
  dexon.on('update',(account) => {
    render(account)
  })

  $('#bbs-login').click(() => { dexon.login() })
}

$(main)