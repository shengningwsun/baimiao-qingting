# 白庙晴庭

根据两层房屋平面图与外观效果图制作的 3D 房屋漫游 Android App。可参观各个房间、二楼阳台与门外平台；室内装修为设计补全。

[下载最新安卓安装包](https://github.com/shengningwsun/baimiao-qingting/releases/latest/download/baimiao-qingting.apk) · [版本与发布说明](https://github.com/shengningwsun/baimiao-qingting/releases)

## 安装与使用

- Android 8.0 及以上，安装包约 97 MB。
- 下载 APK 后按手机系统提示安装；房屋、家具和纹理随安装包提供，可离线参观。
- 默认横屏、流畅画质，菜单默认收起。左侧摇杆移动，拖动右侧转动视角。
- 自由步行时点右下角“加速”开启约 1.7 倍快走，再点“慢走”恢复；菜单里的问号提供手机版操作帮助。
- 天气按钮按“晴日 → 黄昏 → 夜晚”循环切换，夜晚有月亮、星空和室内暖灯。
- 1.0.4 修复地板与阳台等材质交界闪动，并更换白底房屋图标；原始高清家具与贴图保留。
- 已安装旧版时可直接覆盖安装，保持相同应用 ID 和签名。

## 软件内更新

1.0.2 开始支持启动后后台检查版本，也可以在菜单中选择“检查更新”。只有发布了更高版本才会提示下载；同版本显示“已是最新版本”。更新下载需要手机能访问 GitHub，离线时不影响参观。

软件会核对下载大小、SHA-256、应用 ID、版本号及签名，再打开系统安装界面，由使用者确认安装。

固定更新信息地址：

```text
https://github.com/shengningwsun/baimiao-qingting/releases/latest/download/latest.json
```

## 本仓库内容

本仓库用于安装包分发与更新，每个正式 Release 提供 `baimiao-qingting.apk` 和对应的 `latest.json`。家具、纹理及依赖的作者和许可说明在 App 的操作说明及随附资源中提供。更新下载不改变素材许可。

1.0.4 已通过本地签名、资源完整性、地面接缝、通行与手机触控模拟检查；安卓真机系统更新流程仍待验证。
