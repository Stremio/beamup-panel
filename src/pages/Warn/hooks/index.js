import { useState, useEffect, useRef } from 'react';

export function useStreamingResponse() {
  const [responseLines, setResponseLines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const responseContainerRef = useRef(null);

  // Auto-scroll to the bottom of the response container when new content arrives
  useEffect(() => {
    if (responseContainerRef.current) {
      responseContainerRef.current.scrollTop = responseContainerRef.current.scrollHeight;
    }
  }, [responseLines]);

  const streamResponse = async (url) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    setResponseLines([]);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`${url}&t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Check if response can be read as a stream
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Process any remaining data in the buffer
            if (buffer) {
              setResponseLines(prevLines => [...prevLines, buffer]);
            }
            break;
          }
          
          // Decode the received data
          const text = decoder.decode(value, { stream: true });
          buffer += text;
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
          
          if (lines.length > 0) {
            setResponseLines(prevLines => [...prevLines, ...lines]);
          }
        }
      } else {
        // Fallback for browsers that don't support streaming
        const text = await response.text();
        const lines = text.split('\n');
        setResponseLines(lines);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsError(true);
      setErrorMessage(error.message);
      setResponseLines(prevLines => [...prevLines, `Error: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    responseLines,
    isLoading,
    isError,
    errorMessage,
    streamResponse,
    responseContainerRef
  };
}

export function useQueryParams() {
  const [queryParams, setQueryParams] = useState({ project: '', actionType: '', agreeLink: '' });
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const project = searchParams.get('proj') || '';
    const actionType = searchParams.get('action') || '';

    if (project && actionType) {
      setQueryParams({
        project, 
        actionType, 
        agreeLink: `/${actionType === 'delete' ? 'doDelete' : 'doRestart'}?domain=${encodeURIComponent(window.location.hostname)}&proj=${encodeURIComponent(project)}` 
      });
    }
  }, []);

  return queryParams;
}