/**
 * 韬冠律所全流程字典配置（完整覆盖《9.10版需求说明书》与《刑事辩护收案审批填报》全部 42 条批注）。
 */

export const CRIMINAL_STAGES = [
  "羁押状态律师仅会见咨询（不含其他服务）",
  "侦查",
  "审查起诉",
  "控告",
  "一审",
  "二审",
  "重审一审",
  "重审二审",
  "申诉",
  "执行",
  "刑罚与执行变更",
  "死刑复核",
  "强制医疗",
  "复议",
  "复核",
  "速裁程序",
  "简易程序",
  "恢复执行"
] as const;

export const CRIMINAL_FEE_MODES = [
  {
    code: 1,
    label: "选择1：不分阶段委托一次性收费",
    description: "含选项A（至一审裁判文书/10日内会见止）与选项B（至二审终审裁判文书止）"
  },
  {
    code: 2,
    label: "选择2：多阶段委托一次性收费",
    description: "一次性付清律师费，须多选委托阶段"
  },
  {
    code: 3,
    label: "选择3：多阶段委托但分期收费",
    description: "定额收费（分期付款），须多选委托阶段并在备注中注明分期节点"
  },
  {
    code: 4,
    label: "选择4：单个阶段委托一次性收费",
    description: "仅限单选一个委托阶段，一次性收费"
  },
  {
    code: 5,
    label: "选择5：律师仅会见和咨询业务",
    description: "定额按次收费，合计金额 = 单价 × 约定次数（系统自动计算不可手改）"
  },
  {
    code: 6,
    label: "选择6：法律援助",
    description: "区分「司法部门委托指定法律援助」或「律所内部公益安排法律援助」，须填费用说明"
  },
  {
    code: 7,
    label: "选择7：其他委托和付费方式",
    description: "勾选后须在主页面填写详细收费与委托方式说明"
  }
] as const;

export const COERCIVE_MEASURES = [
  "拘传",
  "拘留",
  "取保候审",
  "监视居住",
  "逮捕",
  "刑事自诉案被告人",
  "未采取强制措施"
] as const;

export const CLIENT_SUSPECT_RELATIONS = [
  "委托人是嫌疑人/被告人本人",
  "委托人是嫌疑人/被告人父或母",
  "委托人是嫌疑人/被告人配偶",
  "委托人是嫌疑人/被告人亲兄弟姐妹",
  "委托人是嫌疑人/被告人成年子女",
  "委托人是嫌疑人/被告人监护人",
  "社区街道、法援机构指派或其他"
] as const;

export const COMMON_CRIMINAL_CHARGES = [
  "盗窃罪",
  "诈骗罪",
  "合同诈骗罪",
  "职务侵占罪",
  "挪用资金罪",
  "非国家工作人员受贿罪",
  "贪污罪",
  "受贿罪",
  "行贿罪",
  "挪用公款罪",
  "非法吸收公众存款罪",
  "集资诈骗罪",
  "帮助信息网络犯罪活动罪",
  "掩饰、隐瞒犯罪所得、犯罪所得收益罪",
  "开设赌场罪",
  "赌博罪",
  "非法经营罪",
  "虚开增值税专用发票罪",
  "逃税罪",
  "走私普通货物、物品罪",
  "生产、销售伪劣产品罪",
  "假冒注册商标罪",
  "侵犯商业秘密罪",
  "故意伤害罪",
  "故意杀人罪",
  "过失致人死亡罪",
  "交通肇事罪",
  "危险驾驶罪",
  "寻衅滋事罪",
  "聚众斗殴罪",
  "敲诈勒索罪",
  "抢劫罪",
  "强奸罪",
  "猥亵儿童罪",
  "非法拘禁罪",
  "绑架罪",
  "组织、领导、参加黑社会性质组织罪",
  "贩卖、运输、制造毒品罪",
  "非法持有毒品罪",
  "容留他人吸毒罪",
  "组织卖淫罪",
  "妨害公务罪",
  "袭警罪",
  "拒不执行判决、裁定罪",
  "虚假诉讼罪",
  "侵犯公民个人信息罪",
  "非法利用信息网络罪",
  "重大责任事故罪",
  "污染环境罪",
  "非法采矿罪"
] as const;

export const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME_LAWYER: "专职律师",
  PART_TIME_LAWYER: "兼职律师",
  INTERN_LAWYER: "实习律师",
  ADMIN_STAFF: "行辅人员",
  BUSINESS: "商务人员",
  OTHER: "其他人员"
};

export const INVOICE_CATEGORIES: Record<string, string> = {
  A_CONFIRMED: "A. 等于入账金额并已确认",
  B_WAIT_CONFIRM: "B. 等于入账金额等待确认",
  C_PRE_INVOICE: "C. 先开票后入账（超30天红警）",
  D_OTHER: "D. 其它特殊开票"
};

export const CERT_TYPES: Record<string, string> = {
  COURT_APPEARANCE: "出庭证 / 律师事务所函",
  INTRO_LETTER: "律师调查专用介绍信",
  MEETING_LETTER: "会见在押犯罪嫌疑人/被告人专用介绍信",
  INVESTIGATION_LETTER: "调查取证函",
  LAWYER_LETTER: "律师函",
  CONTRACT_SEAL: "委托代理（辩护）合同电子用印件"
};

export const ADMIN_REQUEST_TYPES: Record<string, string> = {
  PROCUREMENT: "律所采购申请",
  EXTERNAL_CONTRACT: "对外签署合约申请",
  EXTERNAL_PAYMENT: "律所对外付款申请",
  RECRUITMENT: "人员招聘申请",
  GENERAL: "其他一般行政事务"
};

export const PERSONAL_FINANCE_REQUEST_TYPES: Record<string, string> = {
  C1_SALARY: "申请实发工资 / 提成发放 (C1)",
  C8_HOUSING_FUND: "申请公积金缴纳 (C8)",
  C9_REIMBURSEMENT: "申请个人报销 (C9)",
  C10_PERSONAL_OUT_PAY: "申请个人对外付款 (C10)",
  D3_TAX_REFUND: "申请个税结差退还 (D3)",
  D4_MGMT_REFUND: "申请管理费结差退还 (D4)",
  RECONCILIATION: "律所定期财务对账确认"
};

export const CRIMINAL_WORKFLOW_LABELS: Record<string, string> = {
  DRAFT: "1. 草稿暂存（30天自动清理）",
  CONFLICT_LOCKED: "2. 主表已锁定 · 利冲审查中",
  CONFLICT_RESOLUTION: "3. 真/假利冲解决程序（收案暂停）",
  CLIENT_SIGN_REVIEW: "4A. 客户先签章 · 审核与验原件",
  FIRM_SEAL_PENDING: "4B. 律所先签章 · 待管委会电子用印",
  FIRM_SEALED_WAITING_RETURN: "5B. 已电子红章 · 待客户实体回寄",
  ORIGINAL_VERIFY: "6. 原件三件一致核验中",
  FORMAL_ACCEPTED: "7. 已确认收到 · 赋正式案号转在办",
  REJECTED: "已拒绝结束",
  WITHDRAWN: "已撤回"
};
