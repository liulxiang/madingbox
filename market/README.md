# 发布用索引

这个目录不参与 npm 打包，只用于插件市场。

## 自托管索引

`market/index.json` 是一份 format-1 插件索引。DSH 本身不内置索引源，所以需要把它放到一个静态地址上，用户在「插件 → 发现 → 添加索引源」里手动添加。

两种托管方式：

- GitHub Pages：把仓库的 `/market` 发布为站点，地址形如 `https://liulxiang.github.io/madingbox/index.json`
- jsDelivr：`https://cdn.jsdelivr.net/gh/liulxiang/madingbox@main/market/index.json`

发布新版后，记得同步更新 `index.json` 里的 `version` 和 `publishTimestamp`（Unix 秒）。

## awesome-dsh-plugin 收录

`market/awesome-entry.yml` 是给 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的条目草稿。提交时把它复制为：

```text
data/plugins/liulxiang__madingbox.yml
```

只改这一个文件，不要手工改仓库生成的 README。收录后，基于该列表的插件市场（如 `realguan/dsh-plugin-market`）会自动同步，不需要单独提 PR。

## 商店截图

`store-listing.md` 里有一份截图清单。真实 UI 截图放到 `assets/screenshots/` 后，在仓库根新增 `screenshots.json`，格式为 1–8 个相对路径的数组。不要用示意图或伪造界面代替。
