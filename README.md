<div align="center">

[![logo](https://github.com/arkntools/arknights-toolbox/raw/master/public/assets/icons/texas-icon-192x192-v2.png)](https://github.com/arkntools)

# Arkntools - Arknights Gacha Export

明日方舟干员寻访记录导出工具

原作：[biuuu/genshin-wish-export](https://github.com/biuuu/genshin-wish-export)

</div>

## 使用说明

> 目前只支持官服

1. 下载工具后解压 - [下载地址](https://github.com/arkntools/arknights-gacha-export/releases/latest/download/Arknights-Gacha-Export.zip)
2. 点击工具的“加载数据”按钮，会弹出对话框要求输入 token
3. 前往明日方舟官网 https://ak.hypergryph.com 登录，之后打开网址 https://as.hypergryph.com/user/info/v1/token_by_cookie 获取 token 并填入
4. 如果没出什么问题的话，你会看到正在读取数据的提示，最终效果如下图所示
   <details>
    <summary>展开图片</summary>

   再给 yj 充钱我就是狗.jpg  
   ![预览](/docs/preview.png)
   </details>

如果需要导出多个账号的数据，可以点击旁边的加号按钮，再点击“加载数据”即可

注意：官网只会保留 30 天内的 100 条抽卡记录（10 连只算 1 条），后续请自行注意数据更新周期以防遗漏

## TODO

- [x] 按需拉取寻访数据
- [ ] 自动定时更新寻访数据

## 定时更新寻访数据

加上 `--silent` 参数启动可以在后台静默更新所有帐号的寻访数据，完成后会自动退出

Windows 可以利用**任务计划**来定时运行

推荐频率每周一次

## TODO

- [x] 按需拉取寻访数据
- [x] 定时更新寻访数据
- [ ] MacOS 支持

## Development

```bash
# 安装模块
yarn install

# 开发模式
yarn dev

# 构建一个可以运行的程序
yarn build
```

## License

[MIT](/LICENSE)

应用图标来自 Pixiv [QuAn_](https://www.pixiv.net/users/6657532)，版权归画师所有
