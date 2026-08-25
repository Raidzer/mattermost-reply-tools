import React, {useEffect} from 'react';

import '../styles/quoted_reply.scss';

const QuotedReplyStyles: React.FC = () => {
    useEffect(() => {
        document.body.classList.add('quoted-reply-plugin-active');
        return () => {
            document.body.classList.remove('quoted-reply-plugin-active');
        };
    }, []);

    return null;
};

export default QuotedReplyStyles;
