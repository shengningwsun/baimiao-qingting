# 素材来源

## 真实商品家具模型（2026-10-07 更新）

家具与部分室内摆件来自 [Amazon Berkeley Objects (ABO)](https://amazon-berkeley-objects.s3.amazonaws.com/index.html)，数据与模型版权归属 **Amazon.com**，依照 [Creative Commons Attribution 4.0 International / CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用。许可全文随项目保存在 `dist/vendor/ABO-CC-BY-4.0.txt`。

数据集构建作者：Matthieu Guillaumin、Thomas Dideriksen、Kenan Deng、Himanshu Arora、Arnab Dhua、Xi (Brian) Zhang（Amazon.com）。这些作者与 Amazon.com 未为本漫游项目背书。

| 家具与商品模型 | 原始模型 ID | 本地颜色贴图 | 三角形数量（单件） |
| --- | --- | --- | --- |
| Stone & Beam Westport 亚麻扣钉沙发 | B075X4QMX3 | 4096 × 4096 | 49,850 |
| Stone & Beam Prudence 拉扣软包床，含床品与枕头 | B07B4ZM56C | 2048 × 2048 | 65,470 |
| Rivet Claremont 双抽屉床头柜 | B07QD6TXWS | 4096 × 4096 | 14,240 |
| Movian Fils 双门衣柜 | B07JGMW8DG | 4096 × 4096 | 9,762 |
| Stone & Beam Industrial 芒果木与金属圆餐桌（当前餐厅） | B07HSBJDQP | 2048 × 2048 | 1,464 |
| Rivet Fulton 实木餐桌（历史资产，当前场景不加载） | B07QGWMTDY | 4096 × 4096 | 17,464 |
| Rivet 曲面软包餐椅 | B07QBQCG77 | 4096 × 4096 | 9,916 |
| Ravenna Home Justin 木与金属双层茶几 | B07DBFFFYZ | 2048 × 2048 | 4,512 |
| Rivet Roxmere 电视柜 | B07HSG5DGP | 2048 × 2048 | 7,546 |
| Stone & Beam 木与藤编书柜 | B07B7J2VCD | 2048 × 2048 | 38,530 |
| Stone & Beam 陶瓷台灯 | B07MBFDHMH | 4096 × 4096 | 14,548 |
| Stone & Beam 浮雕陶瓷花瓶 | B075HR4ZDB | 4096 × 4096 | 18,080 |
| AmazonBasics 白橡木双门浴室柜 | B07S6XKT5X | 4096 × 4096 | 见资源清单 |
| Rivet Jonathan 胡桃木框镜子 | B07B4W5R8N | 2048 × 2048 | 见资源清单 |
| Ravenna 织物与金属吸顶灯 | B07DBHC39X | 2048 × 2048 | 见资源清单 |
| Rivet Molly 大理石与不锈钢双层圆桌 | B072ZMSBQT | 2048 × 2048 | 24,120 |

原始下载地址、详细商品名称、贴图分辨率和文件大小记录在 `dist/furniture-assets.json`。模型本身存入 `dist/assets/<模型 ID>.glb`；离线 HTML 内嵌所有模型和纹理，不依赖在线下载。

本项目所作修改：模型按住宅布局调整尺寸和朝向，保留原网格、UV 和物理材质；真实 4K 颜色贴图保留 4K，原本 2K 的资产保留 2K；法线、粗糙度和金属度贴图以 2K 打包；纹理改为高质量 JPEG 以减小离线文件，并配置环境遮蔽、阴影与灯具发光。ABO 共使用 15 种真实商品资产。

## 卫浴、厨房与餐具模型（本次新增）

马桶与洗手盆来自 **loafbrr_1** 的 [Toilets](https://opengameart.org/node/165996)，以 [CC0](https://creativecommons.org/publicdomain/zero/1.0/) 发布。采用带水箱的坐便器和带混合龙头的陶瓷盆，保留座圈、水箱盖、冲水柄、陶瓷曲面、排水口和龙头网格。原始贴图为 **1024 × 1024**；颜色、法线及 AoRM 贴图已嵌入 GLB。移除原导出文件的无光照材质，恢复 PBR、环境遮蔽与法线材质，再按四间卫生间的尺寸摆放。没有将 1K 素材描述为 4K 素材。

厨房与餐具来自 [Sweet Home 3D 官方免费模型库](https://www.sweethome3d.com/free-3d-models/)。原始下载地址、作者、网格数量和实际贴图尺寸见 `dist/room-assets.json`；模型保存在 `dist/assets/`，也全部内嵌在离线 HTML 中。这些为现实器具造型的模型，并非摄影扫描商品。

| 资产 | 原作者与来源 | 许可 |
| --- | --- | --- |
| Country Kitchen 水槽柜、双门地柜、抽屉柜、吊柜、六炉头双烤箱 | **Jay-Artist**，[Country-Kitchen Cycles](http://www.blendswap.com/blends/view/42851)，通过 Sweet Home 3D 分发 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| 上述水槽柜的双槽水槽与修改 | **Andrew Kator & Jennifer Legaz**（双槽水槽），**Emmanuel Puybaret**（整合与修改） | CC BY 3.0 |
| 家用冰箱 frigo | **Gael Bettinelli**，通过 Sweet Home 3D 分发；原始 MTL 明确允许 Free Art / CC BY 3.0 双许可择一，本项目选择后者 | CC BY 3.0 |
| 抽油烟机、咖啡机、电饭煲、瓷杯及杯碟 | **Scopia Visual Interfaces Systems, s.l.**，通过 Sweet Home 3D 分发 | CC BY 3.0 |
| 陶瓷餐盘、杯子与餐具组合 | **Andrew Kator & Jennifer Legaz**，通过 Sweet Home 3D 分发 | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |

修改包括：将 OBJ/MTL 转为自包含 GLB，保留 UV 与原始纹理，将传统材质转换为物理材质，并为金属、陶瓷和漆面配置相应粗糙度。对未提供顶点法线的 OBJ，按原有平滑标记重新计算曲面法线，保留门板折角及斜边。按住宅布局调整尺寸和朝向，添加与摆放一致的碰撞范围。原始许可文件及作者声明保存在 `dist/vendor/Room-Assets-Licenses.txt`。

本版本合计 **28 种导入资产、115 个实例**。模型网格和贴图在相同资产的实例之间共享。四间卫生间的马桶、浴室柜、洗手盆、镜子，以及厨房器具、阳台桌、吸顶灯和餐具已替换；卧室门口和走廊旁的落地植物已移除。窗帘、地毯、墙画、建筑和铺装仍为本项目制作。本版已移除室外花台、菜圃、草地、绿篱和黑色灯柱；历史植被资产只保留在文件中，不在场景中显示。素材作者与分发网站未为本项目背书。

## 建筑与环境材质

场景中的白色灰泥、波纹金属屋顶、木地板、石材、地砖、草地、窗帘与地毯布料纹理，以及日光 HDR 环境贴图取自 [Poly Haven](https://polyhaven.com/)，依照其 [CC0 许可](https://polyhaven.com/license) 使用。本项目已将所需贴图存入 `dist/assets/`，游玩时不需要访问这些网站。

- [White Stucco](https://polyhaven.com/a/white_stucco)：外墙灰泥
- [Corrugated Iron 02](https://polyhaven.com/a/corrugated_iron_02)：屋顶波纹金属
- [Wood Floor](https://polyhaven.com/a/wood_floor)：木地板与木饰面
- [Stone Tiles 02](https://polyhaven.com/a/stone_tiles_02)：庭院石材
- [Large Floor Tiles 02](https://polyhaven.com/a/large_floor_tiles_02)：室内地砖
- [Interior Tiles](https://polyhaven.com/a/interior_tiles)：Charlotte Baglioni 的 CC0 室内陶瓷实拍材质，本次新增 2048 × 2048 颜色、法线和 AO/粗糙度/金属度打包贴图；渲染时调为中性灰色。旧地砖资源继续用于室外铺装。
- [Leafy Grass](https://polyhaven.com/a/leafy_grass)：历史草地素材，本版不再渲染草地
- [Terlenka](https://polyhaven.com/a/terlenka)：窗帘、地毯与餐垫的织物颜色和法线纹理
- [Kloofendal 43d Clear Puresky](https://polyhaven.com/a/kloofendal_43d_clear_puresky)：日光环境反射

`citrus-foliage.png`、`tree-foliage.png` 为本项目生成的透明底植被贴图：分别以“带熟果的写实柑橘枝叶”和“自然光下的写实阔叶树叶簇”为提示制作，并在 3D 场景中重复排布为树冠。`orchard-art.png` 是本项目生成的日光果园风景画，用作室内墙画。房屋平面图和外观效果图由用户提供，仅用于建模参考，保存在 `dist/references/`。

## 本次装修参考（2026-10-09）

用户提供的 [三维家全景](https://720.3vjia.com/S89328028?lang=zh_cn) 用于观察柜门细缝、材质层次、装饰收口及室内光线。网站全景图和模型未纳入安装包。白墙、灰色地砖、床尾毯、毛巾、书籍、开关面板、台面收边与固定接触阴影由本项目实现；浴室反射在本地场景加载后捕获一次，不包含人物或实时摄像头图像。室内仍为设计补全，并非该参考案例的完整复刻。

## 1.0.7 楼梯与餐厅更新

圆餐桌来自 Amazon Berkeley Objects 的 Stone & Beam Industrial Mango Wood Round Dining Table，ID B07HSBJDQP，Amazon.com, Inc.，CC BY 4.0。保留商品网格和原生 2048 × 2048 颜色、法线、粗糙度及金属度纹理；旧长桌仅作为历史资源留存，场景不再加载。资源详情见 furniture-assets.json。

楼梯采用 [Poly Haven White Marble](https://polyhaven.com/a/white_marble) 的 CC0 实拍材质，颜色与粗糙度贴图均为 2048 × 2048，已本地保存。渲染时去除暖色并调成参考照片的灰色，踏面抛光、立面浅灰；几何、扶手及结构板由本项目制作。
