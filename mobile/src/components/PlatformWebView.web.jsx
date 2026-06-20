import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

const PlatformWebView = forwardRef(function PlatformWebView({ source, style, onLoadEnd }, ref) {
  const iframeRef = useRef(null);

  useImperativeHandle(ref, () => ({
    postMessage(data) {
      iframeRef.current?.contentWindow?.postMessage(data, '*');
    },
  }));

  return (
    <View style={[{ flex: 1 }, style]}>
      <iframe
        ref={iframeRef}
        srcDoc={source?.html}
        style={{ border: 'none', width: '100%', height: '100%' }}
        onLoad={onLoadEnd}
      />
    </View>
  );
});

export default PlatformWebView;
