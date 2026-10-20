# LI 接线说明：AI/Persona 预览

> 后续状态：LI 已在 #165 的52f494b完成此接线并纠正 legacy 投影，ZHOU 已对a822091中的指定范围提交独立批准。当前候选不要重复应用以下补丁；参见 [绑定源码的复核与原验证归属](../evidence/sprint3/2026-10-20-zhou-experience/li-integration-review.md)。下文保留首次独立交付的接入说明，适用于尚未接线的基线。

权威：`docs/decisions/2026-10-20-user-zhou-complete-package-execution.md`及所保留19Oct产品/AI-MVP/分工来源。此处是可复核接入补丁；未接管LI主机，未修改两个实际组合文件。

## 一次接入

在取回最终ZHOU源码分支后，先确认下面两个文件未有其它新改动；然后在LI独立整合分支运行：

```sh
git apply --check --whitespace=error docs/integration/2026-10-20-zhou-persona-runtime.patch
git apply docs/integration/2026-10-20-zhou-persona-runtime.patch
```

补丁仅改`lib/app/controlled_demo_app.dart`和`backend/src/bootstrap/retained-core-runtime.ts`。当前模块交付中，两文件仍分别为Git blob`43e94a8939181af81f5b5be21f4632ca0c5e700f`、`cb394d98fd2b647dce6a3b063999894aeeab8032`。如LI已有后续改动，按以下接缝合入，不覆盖旧文件或重复套补丁。

- Flutter复用原`widget.baseUri`、`widget.auth.getIdToken`、调用者拥有的`widget.client`建立`BackendPersonaPreviewRepository`；不另建连接、缓存或持久数据。覆盖`personaPreviewRepositoryProvider`，并将`personaPreviewAccessProvider`绑定到新增app-owned `connectedPersonaPreviewAccessProvider`。该helper实际观察现有Auth session与`accountPreferencesControllerProvider(PreferencesView.settings)`，仅`ready && consent.accepted`允许预览；加载、保存、失败、冲突、退出及同UID新session先拒绝，等待对应新设置。它是表现层门禁，Backend仍独立复核。
- Backend仅已有`chat && healthy && chatTransport`时构造一次`PreviewPersona(new FirestorePersonaPreviewAuthority(gateway), chatTransport, ()=>performance.now(), ()=>chatTransport.state.pending)`，通过现有`buildApp.isolatedSlices.personaPreview`接入。保留当前gateway、同一模型transport及单生成容量，不重装或新启模型。
- `stopAi`先同步关闭preview admission；传入预览的`control.current`同时绑定该开关和当前healthy。因此已开始但尚在Auth/权限等待中的预览也不能在停止后开始生成或交付。已有真实生成仍由原transport pending状态正常等待，不盲重发未知结果。

`buildApp`的可选预览路由接缝、`isolated-conversation-composition`的Persona自由表达与会话历史转发已在ZHOU模块源码实现，补丁不重复修改。历史API经原`chat.operations`展开传给既有组合，无需第二条保存路径。

## 已执行与LI验收

模块源码下`git apply --check --whitespace=error`通过。新增helper与真实设置controller/preview-controller组合测试**2/2 Pass**；scoped fatal-info analysis和2文件非写入格式检查通过。首次组合测试未推进惰性provider的设置加载边界，1Pass/1Fail；加入实际状态读取后再推进一次provider pump，不改产品或断言，最终通过。初始及诊断日志仍在build目录。最终日志`build/zhou-preview-composition-tests-final.log` SHA256`2bdd6dfab8973fe52540bdf91d380c69568affcf18c1dae743fea99af79fd20b`。

补丁SHA256`e98702246359121bb4de70f4e5b5ffb41529fc4b7c17599a235d0df56cd9908e`。本说明不替代最终源码SHA；根交付回执提供提交身份。根代理会在该提交的隔离副本应用补丁并编译/定向检查；本子任务没有对已应用版本作执行通过声明。

LI最终同一候选验收：拒绝/撤回同意时预览不可用；编辑尚未保存的完整Persona草稿并试聊，退出后正式聊天历史不增加且当前Persona不变；保存/重新读取/切换/删除（当前删除恢复默认表达）；真实三轮相关聊天、离开回读与再次发送；历史选择/已过期历史/错误显式恢复；底部新消息跟随与查看旧消息保持位置。未知操作先查原结果，不自动重发。真实模型、实际服务保存/正常重启、原生设备与最终组合APK在本子任务均为**Not Run**，由LI提供新证据，不借用旧v6结果。
