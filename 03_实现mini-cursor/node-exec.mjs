import { spawn } from "node:child_process"

// const command = 'ls -la aa' // 定义要执行的命令, 'ls -la'是列出目录所有文件
const command = 'echo -e "n\nn" | pnpm create vite mini-cursor --template react-ts'
const cwd = process.cwd() // 获取当前工作目录
console.log(cwd) // /Users/zhangxinxin/Desktop/projects/ai

const [cmd, ...args] = command.split(' ') // 把命令字符串按空格拆开
console.log(command.split(' '), '-', cmd, args) // ls ['-la']

// 准备执行子进程命令
const child = spawn(cmd, args, {
  cwd, // 在当前目录执行
  stdio: 'inherit', // 子进程的输入输出继承父进程(能看到输出)
  shell: true // 使用shell执行
})

let errorMessage = '' // 错误信息

// 监听: 如果子进程启动失败(比如命令不存在),记录错误
child.on('error', error => {
  errorMessage = error.message
})

// 监听: 子进程结束时执行回调,code是退出码
child.on('close', code => {
  if (code === 0) {
    process.exit(0)
  } else {
    if (errorMessage) {
      console.log(`错误: ${errorMessage}`)
    }
    process.exit(code || 1)
  }
})