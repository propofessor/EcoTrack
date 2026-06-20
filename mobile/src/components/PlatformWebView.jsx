import { forwardRef } from 'react';
import { WebView } from 'react-native-webview';

const PlatformWebView = forwardRef((props, ref) => <WebView ref={ref} {...props} />);

export default PlatformWebView;
