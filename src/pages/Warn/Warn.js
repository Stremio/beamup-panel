import { useState } from 'react';
import styles from './styles.module.scss';
import { useStreamingResponse, useQueryParams } from './hooks/index';

function capitalizeFirstLetter(string = 'yes') {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function Home() {
    const { project, actionType, agreeLink } = useQueryParams();
    const {
        responseLines,
        isLoading,
        isError,
        streamResponse,
        responseContainerRef
    } = useStreamingResponse();
    
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [showResponse, setShowResponse] = useState(false);
    const [cancelText, setCancelText] = useState('Cancel');

    const handleActionClick = () => {
        // Show response container
        setShowResponse(true);
        
        // Start streaming the response
        streamResponse(agreeLink);
        
        // Disable the button
        setButtonDisabled(true);
        
        // Change Cancel to Back to Dashboard
        setCancelText('Back to Dashboard');
    };

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.warnMsg}>Are you sure you want to <span className={styles.redText}>{actionType}</span> "{project}"?</h2>
            <div className={styles.buttonContainer}>
                <a href="/" className={styles.buttonLink}>
                    <button type="button" className={styles.warnButton}>{cancelText}</button>
                </a>
                <button 
                    className={`${styles.warnButton} ${styles.warnRed}`} 
                    onClick={handleActionClick}
                    disabled={buttonDisabled}
                >
                    {capitalizeFirstLetter(actionType)}
                </button>
            </div>
            {showResponse && (
                <div className={styles.iframeContainer} ref={responseContainerRef}>
                    <div className={styles.responseContent}>
                        {responseLines.map((line, index) => (
                            <div key={index} className={styles.responseLine}>
                                {line}
                            </div>
                        ))}
                        {isLoading && <div className={styles.loadingIndicator}>Loading...</div>}
                        {isError && <div className={styles.errorMessage}>An error occurred while processing your request.</div>}
                    </div>
                </div>
            )}
        </section>
    );
}