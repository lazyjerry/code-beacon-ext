import * as assert from 'node:assert/strict';

import { buildGutterSvg, escapeXml, GUTTER_ICON_SETS } from '../../src/core/gutterSvg';

suite('buildGutterSvg', () => {
  test('四種樣式組都產出合法的 16x16 SVG', () => {
    for (const iconSet of GUTTER_ICON_SETS) {
      const svg = buildGutterSvg(iconSet, 'error', '#e45454', '🔴');
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 16 16" width="16" height="16">.*<\/svg>$/);
    }
  });

  test('default 是圓角方塊、circle 是圓、letter 用字母、emoji 走 text', () => {
    assert.match(buildGutterSvg('default', 'warning', '#ff942f', ''), /<rect .*rx="2" fill="#ff942f"/);
    assert.match(buildGutterSvg('circle', 'info', '#00b7e4', ''), /<circle .*fill="#00b7e4"/);
    assert.match(buildGutterSvg('letter', 'hint', '#2faf64', ''), />H<\/text>/);
    assert.match(buildGutterSvg('emoji', 'error', '#e45454', '🔴'), />🔴<\/text>/);
  });

  test('顏色與 emoji 會跳脫，塞不進 XML 屬性或標籤', () => {
    assert.equal(escapeXml('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    assert.doesNotMatch(buildGutterSvg('circle', 'error', '"/><script>', ''), /<script>/);
  });
});
