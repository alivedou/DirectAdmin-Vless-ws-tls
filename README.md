
本项目fork自大佬易分享的项目，在其项目上运用AI修改了代码，
使其可以添加其他大佬更新.txt格式的优选域名，获得多个优选订阅链接。

部署过程可以参考易分享大佬的操作步骤，需要油管搜索@easysharing，视频按照最新排序，标题为【最新精简+优化】免费虚拟主机创建+部署全流程。
https://youtu.be/nXbSRIvLQhg?si=3i2G9K2KHnykrIwz
### Vless+ws+tls 自适应端口+多优选域名+CF保活方案 说明：

* 最新精简版本，通用于Webfreecloud、Web.C-Servers、WebHostMost
  
* 端口自适应，无需设置端口变量

* 增加可选项：可以添加大佬收集的优选IP地址。

* 多区域优选域名覆盖，延迟低，网络表现优异


-----------------------------------------------------------

### 使用方法：

* 1：更新DirectAdmin面板域名，确保域名已托管至Cloudflare，并添加一条DNS记录，指向DirectAdmin

* 2：index.js+package.json上传至域名文件夹内的public_html目录
   编辑index.js，必须修改的两个变量：
  注释1处： **UUID**
  注释2处的： **域名**

  可选项：
  注释3处的**优选订阅**。
  添加优选订阅链接，在浏览器输入https://BestCF.pages.dev 在优选域名栏下复制xxx.txt链接，替换掉index.js注释3处的文本，可填多个地址，如果三个不够的话，可以自己往后加格式一致即可。
  
  ps：如果可以的话，编辑后的index.js文件内容可以用js混淆，混淆网站地址在上面的网页链接也可以找到。

* 3：返回进入面板主页--附加功能--Setup Node.js APP
  点击右上角选择创建应用，版本用官方的，推荐的22.x.x。
   
     *输入：

  路径：public_html

  文件：index.js

     *然后分别点击：

  CREATE APPLICATION

  Run NPM Install

  Run JS script

  start

  Run JS script
  
* 4：浏览器访问 域名/UUID，可见节点链接地址，可选择将这个 域名/UUID 直接导入到v2rayN新的订阅分组中，也可复制下面的订阅内容导入到2rayN已有分组。
  
* 5：报错后无法删除app的详细解决步骤：
  先将原域名a.example.com重命名为b.example
  然后在文件夹管理里面根目录找到venv/domains，删除里面原有的名为a.example.com的文件夹，
  再返回附件里面的nodejs删除刚才部署的application应用，点击删除后需要刷新几次才会显示真正删除，
  除此之外，还建议去到文件夹domains将b.example.com/public_html上一个应用运行的残留的文件删掉，
  最后重新将域名b.example.com改回a.example.com。
  做完这些后，重新部署1-4。


如果实在看不懂我说的文字版，需要去我上面推荐的油管频道看视频。

  * （进阶可选）
  * 1:Cloudflare Workers保活方案：
  
保活需要cloudflare创建一个以hello word 为模板的pages，并将vless-alive的代码复制到pages的代码编辑中，需要修改域名加uuid，并且在设置里添加触发事件：设置每30分钟触发一次。
  * 2.用AI生成一个html文件，替换domain/a.example.com/public_html文件夹下的html文件用来展示网站首页。
提示词示例如下:
帮我生成一个完整的单文件 HTML 网站（包含 HTML、CSS 和少量 JavaScript），网站面向意大利用户，所有文字内容必须使用意大利语。
网站主题为“保护水资源”。要求页面整体风格现代简洁环保主题，内容包含主题相关的多个图片和文章。

感谢易分享大佬的开源分享，项目源地址：https://github.com/eishare/DirectAdmin-Vless-ws-tls


