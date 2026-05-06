# Bilibili Playback Rate Menu

Chrome 扩展：增强 B 站视频播放器原生倍速菜单，提供 `0.25x` 到 `4x` 的倍速选项，步长为 `0.25x`。

## 功能

- 自动作用于 `https://www.bilibili.com/*` 页面。
- 修改 B 站播放器原生“倍速”菜单。
- 倍速选项范围：`0.25x`、`0.5x`、`0.75x`、`1x` ... `4x`。
- 菜单高度会根据视频展示区域自动限制，超出时显示细滚动条。

## 本地安装

1. 打开 Chrome。
2. 进入 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择项目根目录：

   ```text
   E:\CodexWorkSpace\B站加速插件
   ```

6. 打开或刷新 B 站视频页面。
7. 点击播放器原生“倍速”按钮，选择需要的倍速。

## 使用打包版本

已生成 zip 包：

```text
E:\CodexWorkSpace\B站加速插件\dist\bilibili-playback-rate-menu-0.1.0.zip
```

如果需要在 Chrome 中打包成 `.crx`：

1. 进入 `chrome://extensions`。
2. 开启“开发者模式”。
3. 点击“打包扩展程序”。
4. 扩展程序根目录选择：

   ```text
   E:\CodexWorkSpace\B站加速插件\dist\bilibili-playback-rate-menu-0.1.0
   ```

5. 第一次打包时私钥文件留空。
6. 打包后保留生成的 `.pem` 文件，后续升级复用它以保持扩展 ID 不变。

## 开发验证

运行测试：

```powershell
npm test
```

当前测试覆盖：

- 倍速列表生成。
- 倍速文本格式化。
- B 站原生倍速菜单替换。
- B 站菜单重建后的重新 patch。
- 视频 `playbackRate` 同步。
- 菜单高度按视频展示区域和倍速按钮位置限制。
