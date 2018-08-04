const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

const socketCache = []

app.use(express.static('.'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html')
})

io.on('connection', socket => {
  console.log(`[connection] ${socket.id}`)
  socket.on('disconnect', reason => {
    let index = socketCache.findIndex(elem => elem.socketId === socket.id)
    if (index > -1 && socketCache[index].nickname) {
      console.log(`[disconnect] ${socketCache[index].nickname} 下车了`)
      socket.broadcast.emit('user exit broadcast', socketCache[index].nickname)
      socketCache.splice(index, 1)
      io.sockets.emit('get all connected nickname', socketCache.map(elem => elem.nickname))
    }
    console.log(socketCache)
  })

  socket.on('join broadcast', nickname => {
    let index = socketCache.findIndex(elem => elem.nickname === nickname)
    if (index === -1) {
      console.log(`[join broadcast] ${nickname} 上车了`)
      socketCache.push({ nickname: nickname, socketId: socket.id })
      io.to(socket.id).emit('self join response', { success: true, message: '' })
      socket.broadcast.emit('user join broadcast', nickname)
      io.sockets.emit('get all connected nickname', socketCache.map(elem => elem.nickname))
    } else {
      io.to(socket.id).emit('self join response', { success: false, message: '用户名已被占用' })
    }
    console.log(socketCache)
  })

  socket.on('join reconnect', nickname => {
    let index = socketCache.findIndex(elem => elem.nickname === nickname)
    if (index === -1) {
      console.log(`[join reconnect] ${nickname} 重新建立连接`)
      socketCache.push({ nickname: nickname, socketId: socket.id })
      io.to(socket.id).emit('self reconnect response', { success: true, message: '已为你重新建立连接' })
      socket.broadcast.emit('user reconnected', nickname)
      io.sockets.emit('get all connected nickname', socketCache.map(elem => elem.nickname))
    } else {
      io.to(socket.id).emit('self reconnect response', { success: false, message: '用户名已被占用' })
    }
    console.log(socketCache)
  })

  socket.on('typing broadcast message', nickname => {
    console.log(`[typing broadcast message] ${nickname} 正在输入...`)
    socket.broadcast.emit('user typing broadcast message', nickname)
  })

  socket.on('broadcast message', ({ nickname, message }) => {
    console.log(`[broadcast message] ${nickname} 广播消息：${message}`)
    socket.broadcast.emit('user broadcast message', { nickname, message })
  })

  // socket.on('privateMsg', ({ fromNickname, toSocketId, message }) => {
  //   console.log(`[privateMsg] ${fromNickname} said to ${toSocketId}: ${message}`)
  //   socket.broadcast.to(toSocketId).emit('user private msg', {
  //     fromNickname: fromNickname,
  //     fromSocketId: socket.id,
  //     message: message
  //   })
  // })
})

http.listen(8081, () => {
  console.log('listening on *:8081')
})