const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

const socketCache = []

io.on('connection', socket => {
  console.log(`[connection] ${socket.id}`)
  socket.on('disconnect', reason => {
    let index = socketCache.findIndex(elem => elem.socketId === socket.id)
    if (index > -1 && socketCache[index].nickname) {
      console.log(`[disconnect] ${socketCache[index].nickname} 下车了`)
      socket.broadcast.emit('user exit broadcast', socketCache[index].nickname)
      socketCache.splice(index, 1)
      io.sockets.emit('push connected user list', socketCache.map(elem => elem.nickname))
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
      io.sockets.emit('push connected user list', socketCache.map(elem => elem.nickname))
    } else {
      io.to(socket.id).emit('self join response', { success: false, message: '用户名已被占用' })
    }
    console.log(socketCache)
  })
  // 重新建立连接还要做更多事情，比如群组关系也要重建
  socket.on('join reconnect', nickname => {
    let index = socketCache.findIndex(elem => elem.nickname === nickname)
    if (index === -1) {
      console.log(`[join reconnect] ${nickname} 重新建立连接`)
      socketCache.push({ nickname: nickname, socketId: socket.id })
      io.to(socket.id).emit('self reconnect response', { success: true, message: '已为你重新建立连接' })
      socket.broadcast.emit('user reconnected', nickname)
      io.sockets.emit('push connected user list', socketCache.map(elem => elem.nickname))
    } else {
      io.to(socket.id).emit('self reconnect response', { success: false, message: '用户名已被占用' })
    }
    console.log(socketCache)
  })
  socket.on('pull connected user list', () => {
    console.log(`[pull connected user list]`)
    io.sockets.emit('push connected user list', socketCache.map(elem => elem.nickname))
  })
  socket.on('broadcast message', ({ nickname, message }) => {
    console.log(`[broadcast message] ${nickname} 广播消息：${message}`)
    socket.broadcast.emit('user broadcast message', { nickname, message })
  })
  socket.on('send private chat invite', ({ sendNickname, receiveNickname }) => {
    let receiver = socketCache.find(elem => elem.nickname === receiveNickname)
    console.log(`[send private chat invite] ${sendNickname} 邀请 ${receiveNickname} 私聊`)
    if (receiver) {
      io.to(receiver.socketId).emit('receive private chat invite', { sendNickname, receiveNickname })
    }
  })
  socket.on('typing private message', ({ sendNickname, receiveNickname }) => {
    let receiver = socketCache.find(elem => elem.nickname === receiveNickname)
    console.log(`[typing private message] ${sendNickname} 正在输入...`)
    if (receiver) {
      io.to(receiver.socketId).emit('user typing private message')
    }
  })
  socket.on('send private message', ({ sendNickname, receiveNickname, message }) => {
    let receiver = socketCache.find(elem => elem.nickname === receiveNickname)
    console.log(`[send private message] ${sendNickname} 对 ${receiveNickname} 说: ${message}`)
    if (receiver) {
      io.to(receiver.socketId).emit('receive private message', { sendNickname, message })
    }
  })
  socket.on('join group', ({ nickname, groupName }) => {
    socket.join(groupName, () => {
      console.log(`[join group] ${nickname} 加入群组 ${groupName}`)
      io.to(socket.id).emit('join group success')
      io.to(groupName).emit('user join group', { nickname, groupName })
    })
  })
  socket.on('send group message', ({ sendNickname, groupName, message }) => {
    console.log(`[send group message] ${sendNickname} 在群组 ${groupName} 里说: ${message}`)
    io.to(groupName).emit('receive group message', { sendNickname, message })
  })
})

http.listen(8081, () => {
  console.log('listening on *:8081')
})
