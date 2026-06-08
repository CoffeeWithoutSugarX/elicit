// admin 页面共享类型
// 两个 admin 页面（/admin 与 /admin/[conversationId]）共用的状态机类型

/** 页面加载/鉴权/错误状态 */
export type PageState = 'loading' | 'unauthorized' | 'not_found' | 'error' | 'success';
