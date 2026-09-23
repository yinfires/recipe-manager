function AppTest() {
  return (
    <div style={{ padding: '20px', background: '#0A0D12', color: '#E2E8F0', minHeight: '100vh' }}>
      <h1>React 测试成功</h1>
      <p>如果你能看到这段文字，说明 React 正常工作</p>
      <button onClick={() => alert('点击有效')}>测试按钮</button>
    </div>
  );
}

export default AppTest;
