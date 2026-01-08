import React from 'react';

const containerStyle = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: 0,
    padding: 0,
    margin: 0,
};

const iframeStyle = {
    width: '1px',
    height: '1px',
    border: 0,
    opacity: 0,
    pointerEvents: 'none',
};

const HiddenTwitchEmbed = ({channel = 'just_joe_'}) => {
    const twitchIframeSrc =
        `https://player.twitch.tv/?channel=${channel}` +
        '&parent=localhost' +
        '&parent=nedsdecks.netlify.app' +
        '&autoplay=true' +
        '&muted=true';

    return (
        <div style={containerStyle} aria-hidden="true">
            <iframe
                src={twitchIframeSrc}
                title="Twitch Stream (hidden)"
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
                style={iframeStyle}
            />
        </div>
    );
};

export default HiddenTwitchEmbed;
