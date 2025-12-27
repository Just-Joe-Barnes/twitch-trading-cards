import React from 'react';
import '../styles/UserTitle.css';

const UserTitle = ({ username, title, className = '', separator = ' ' }) => {
    const titleName = title?.name ? String(title.name).trim() : '';
    const hasGradient = Boolean(title?.gradient && String(title.gradient).trim());

    const titleStyle = hasGradient
        ? { '--title-gradient': title.gradient }
        : { color: title?.color || 'inherit' };

    return (
        <span className={`user-title ${className}`.trim()}>
            <span className="user-title-name">{username}</span>
            {titleName && (
                <span className="user-title-badge">
                    <span className="user-title-sep">{separator}</span>
                    <span
                        className={`user-title-text${hasGradient ? ' gradient' : ''}${title?.isAnimated ? ' animated' : ''}`}
                        style={titleStyle}
                        title={titleName}
                    >
                        {titleName}
                    </span>
                </span>
            )}
        </span>
    );
};

export default UserTitle;
