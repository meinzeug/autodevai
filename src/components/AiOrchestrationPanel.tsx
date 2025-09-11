/**
 * AI Orchestration Control Panel
 * Comprehensive interface for AI integration features including swarm coordination,
 * SPARC methodology, hive-mind communication, and memory persistence.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Brain, 
  Network, 
  Database, 
  Play, 
  Activity,
  Users,
  Zap,
  Target
} from 'lucide-react';

import { getAiOrchestrationService } from '../services/ai-orchestration';
import {
  SwarmConfig,
  SwarmTopology,
  SparcMode,
  HiveMindCommand,
  HiveMindCommandType,
  CoordinationLevel,
  CoordinationStrategy,
  SwarmMetrics,
  MemoryState,
} from '../types/ai-orchestration';

interface AiOrchestrationPanelProps {
  className?: string;
}

export const AiOrchestrationPanel: React.FC<AiOrchestrationPanelProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orchestrationService] = useState(() => getAiOrchestrationService());
  
  // State for different orchestration features
  const [swarmConfig, setSwarmConfig] = useState<SwarmConfig>({
    topology: SwarmTopology.Hierarchical,
    max_agents: 6,
    strategy: CoordinationStrategy.Adaptive,
    memory_persistence: true
  });
  
  const [swarmMetrics, setSwarmMetrics] = useState<SwarmMetrics | null>(null);
  const [memoryState, setMemoryState] = useState<MemoryState | null>(null);
  const [sessionId] = useState<string>('');
  const [isSwarmActive, setIsSwarmActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // SPARC Mode State
  const [sparcPrompt, setSparcPrompt] = useState<string>('');
  const [selectedSparcMode, setSelectedSparcMode] = useState<SparcMode>(SparcMode.Architecture);
  const [sparcResult, setSparcResult] = useState<string>('');
  
  // Hive-Mind State
  const [hiveMindCommands, setHiveMindCommands] = useState<HiveMindCommand[]>([]);
  const [targetAgents, setTargetAgents] = useState<string>('researcher,coder,architect');
  const [hiveMindPayload, setHiveMindPayload] = useState<string>('{}');
  
  // Memory Management State
  const [memoryKey, setMemoryKey] = useState<string>('');
  const [memoryValue, setMemoryValue] = useState<string>('');
  const [retrievedValue, setRetrievedValue] = useState<string>('');
  
  // Event Handling - Currently commented out as event listeners are not implemented
  useEffect(() => {
    // Event listeners would be implemented when the service supports them
    // const handleOrchestrationEvent = (event: AiOrchestrationEvent) => {
    //   console.log('AI Orchestration Event:', event);
    //   
    //   switch (event.type) {
    //     case 'swarm_status':
    //       if (event.data.status === 'initialized') {
    //         setIsSwarmActive(true);
    //         setSessionId(event.sessionId);
    //       }
    //       break;
    //     case 'memory_update':
    //       refreshMemoryState();
    //       break;
    //     case 'workflow_complete':
    //       setSuccess(`Workflow completed: ${event.data.type}`);
    //       break;
    //   }
    // };

    // orchestrationService.addEventListener('swarm_status', handleOrchestrationEvent);
    // orchestrationService.addEventListener('memory_update', handleOrchestrationEvent);
    // orchestrationService.addEventListener('workflow_complete', handleOrchestrationEvent);
    
    // Initialize session ID when available
    // setSessionId(orchestrationService.getSessionId());
    
    return () => {
      // Cleanup event listeners when available
      // orchestrationService.removeEventListener('swarm_status', handleOrchestrationEvent);
      // orchestrationService.removeEventListener('memory_update', handleOrchestrationEvent);
      // orchestrationService.removeEventListener('workflow_complete', handleOrchestrationEvent);
    };
  }, [orchestrationService]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleError = useCallback((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : String(error);
    setError(`${context}: ${message}`);
    console.error(`${context}:`, error);
  }, []);

  const loadOrchestrationInfo = useCallback(async () => {
    try {
      const info = await orchestrationService.getOrchestrationInfo();
      console.log('AI Orchestration Info:', info);
    } catch (error) {
      handleError(error, 'Failed to load orchestration info');
    }
  }, [orchestrationService, handleError]);

  const refreshMemoryState = useCallback(async () => {
    try {
      const state = await orchestrationService.getMemoryState();
      setMemoryState(state);
    } catch (error) {
      console.error('Failed to refresh memory state:', error);
    }
  }, [orchestrationService]);

  const refreshSwarmMetrics = async () => {
    if (!sessionId) return;
    
    try {
      const metrics = await orchestrationService.getSwarmMetrics(sessionId);
      setSwarmMetrics(metrics);
    } catch (error) {
      console.error('Failed to refresh swarm metrics:', error);
    }
  };

  // Initialize component
  useEffect(() => {
    loadOrchestrationInfo();
    refreshMemoryState();
  }, [loadOrchestrationInfo, refreshMemoryState]);

  // Swarm Management Functions
  const initializeSwarm = async () => {
    setLoading(true);
    clearMessages();
    
    try {
      const result = await orchestrationService.initializeSwarm(swarmConfig);
      setSuccess(result);
      setIsSwarmActive(true);
      await refreshSwarmMetrics();
    } catch (error) {
      handleError(error, 'Failed to initialize swarm');
    } finally {
      setLoading(false);
    }
  };

  // SPARC Mode Execution
  const executeSparxMode = async () => {
    if (!sparcPrompt.trim()) {
      setError('Please enter a prompt for SPARC execution');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const result = await orchestrationService.executeSparxMode(
        sparcPrompt,
        selectedSparcMode,
        isSwarmActive
      );
      setSparcResult(result.result || 'No result returned');
      setSuccess(`SPARC ${selectedSparcMode} mode executed successfully`);
    } catch (error) {
      handleError(error, 'Failed to execute SPARC mode');
    } finally {
      setLoading(false);
    }
  };

  // Hive-Mind Command Processing
  const createHiveMindCommand = async (
    commandType: HiveMindCommandType,
    coordinationLevel: CoordinationLevel = CoordinationLevel.GroupWise
  ) => {
    try {
      const payload = JSON.parse(hiveMindPayload);
      const agents = targetAgents.split(',').map(a => a.trim()).filter(Boolean);
      
      const command: HiveMindCommand = {
        id: Date.now().toString(),
        command_type: commandType,
        target_agents: agents,
        coordination_level: coordinationLevel,
        payload: payload
      };
      
      setHiveMindCommands(prev => [...prev, command]);
      return command;
    } catch (error) {
      handleError(error, 'Failed to create hive-mind command');
      return null;
    }
  };

  const processHiveMindCommand = async (command: HiveMindCommand) => {
    setLoading(true);
    clearMessages();
    
    try {
      const result = await orchestrationService.processHiveMindCommand(command);
      setSuccess(result);
    } catch (error) {
      handleError(error, 'Failed to process hive-mind command');
    } finally {
      setLoading(false);
    }
  };

  // Memory Management Functions
  const storeMemory = async () => {
    if (!memoryKey.trim() || !memoryValue.trim()) {
      setError('Please enter both key and value for memory storage');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const result = await orchestrationService.storeMemory(memoryKey, memoryValue);
      setSuccess(result);
      setMemoryKey('');
      setMemoryValue('');
      await refreshMemoryState();
    } catch (error) {
      handleError(error, 'Failed to store memory');
    } finally {
      setLoading(false);
    }
  };

  const retrieveMemory = async () => {
    if (!memoryKey.trim()) {
      setError('Please enter a key to retrieve memory');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const value = await orchestrationService.retrieveMemory(memoryKey);
      setRetrievedValue(value);
      setSuccess('Memory retrieved successfully');
      await refreshMemoryState();
    } catch (error) {
      handleError(error, 'Failed to retrieve memory');
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive AI Workflow
  const executeComprehensiveWorkflow = async () => {
    if (!sparcPrompt.trim()) {
      setError('Please enter a task description for the comprehensive workflow');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const result = await orchestrationService.executeComprehensiveAiWorkflow(
        sparcPrompt,
        true, // Enable swarm
        selectedSparcMode,
        hiveMindCommands,
        `comprehensive_${Date.now()}`
      );
      
      setSuccess(`Comprehensive AI workflow completed with session ${result['session_id']}`);
      console.log('Comprehensive workflow result:', result);
      
      // Refresh all states
      await refreshSwarmMetrics();
      await refreshMemoryState();
    } catch (error) {
      handleError(error, 'Failed to execute comprehensive AI workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Orchestration Control Panel
            <Badge className="ml-auto">
              AutoDev-AI Roadmap 327-330
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="swarm">Swarm (327)</TabsTrigger>
              <TabsTrigger value="sparc">SPARC (328)</TabsTrigger>
              <TabsTrigger value="hivemind">Hive-Mind (329)</TabsTrigger>
              <TabsTrigger value="memory">Memory (330)</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Swarm Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge>
                      {isSwarmActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {swarmMetrics && (
                      <div className="mt-2 text-sm">
                        <div>Agents: {swarmMetrics.active_agents}</div>
                        <div>Tasks: {swarmMetrics.tasks_completed}</div>
                        <div>Efficiency: {(swarmMetrics.coordination_efficiency * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Memory Layer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memoryState && (
                      <div className="text-sm space-y-1">
                        <div>Entries: {memoryState.total_entries}</div>
                        <div>Hit Rate: {(memoryState.hit_rate * 100).toFixed(1)}%</div>
                        <div>Sessions: {memoryState.active_sessions}</div>
                        <Progress 
                          value={memoryState.hit_rate * 100} 
                          className="mt-2" 
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Session Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="font-mono text-xs">
                        {sessionId.substring(0, 16)}...
                      </div>
                      <div>Active Commands: {hiveMindCommands.length}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Comprehensive AI Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter task description for comprehensive AI orchestration..."
                    value={sparcPrompt}
                    onChange={(e) => setSparcPrompt(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center gap-4">
                    <Select value={selectedSparcMode} onValueChange={(value: SparcMode) => setSelectedSparcMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Specification">Specification</SelectItem>
                        <SelectItem value="Pseudocode">Pseudocode</SelectItem>
                        <SelectItem value="Architecture">Architecture</SelectItem>
                        <SelectItem value="Refinement">Refinement</SelectItem>
                        <SelectItem value="Completion">Completion</SelectItem>
                        <SelectItem value="TddWorkflow">TDD Workflow</SelectItem>
                        <SelectItem value="Integration">Integration</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={executeComprehensiveWorkflow}
                      disabled={loading || !sparcPrompt.trim()}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Execute Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Swarm Tab */}
            <TabsContent value="swarm" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Swarm Configuration (Schritt 327)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Topology</label>
                      <Select 
                        value={swarmConfig.topology} 
                        onValueChange={(value: SwarmTopology) => 
                          setSwarmConfig(prev => ({ ...prev, topology: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hierarchical">Hierarchical</SelectItem>
                          <SelectItem value="Mesh">Mesh</SelectItem>
                          <SelectItem value="Ring">Ring</SelectItem>
                          <SelectItem value="Star">Star</SelectItem>
                          <SelectItem value="Adaptive">Adaptive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Max Agents</label>
                      <Input
                        type="number"
                        value={swarmConfig.max_agents}
                        onChange={(e) => setSwarmConfig(prev => ({ 
                          ...prev, 
                          max_agents: parseInt(e.target.value) || 6 
                        }))}
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={initializeSwarm}
                    disabled={loading || isSwarmActive}
                    className="flex items-center gap-2"
                  >
                    <Network className="w-4 h-4" />
                    Initialize Swarm
                  </Button>
                  
                  {isSwarmActive && (
                    <Button
                      onClick={refreshSwarmMetrics}
                      className="outline ml-2"
                    >
                      Refresh Metrics
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SPARC Tab */}
            <TabsContent value="sparc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SPARC Methodology (Schritt 328)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter your prompt for SPARC processing..."
                    value={sparcPrompt}
                    onChange={(e) => setSparcPrompt(e.target.value)}
                    rows={4}
                  />
                  
                  <div className="flex items-center gap-4">
                    <Select value={selectedSparcMode} onValueChange={(value: SparcMode) => setSelectedSparcMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Specification">Specification</SelectItem>
                        <SelectItem value="Pseudocode">Pseudocode</SelectItem>
                        <SelectItem value="Architecture">Architecture</SelectItem>
                        <SelectItem value="Refinement">Refinement</SelectItem>
                        <SelectItem value="Completion">Completion</SelectItem>
                        <SelectItem value="TddWorkflow">TDD Workflow</SelectItem>
                        <SelectItem value="Integration">Integration</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      onClick={executeSparxMode}
                      disabled={loading || !sparcPrompt.trim()}
                      className="flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Execute SPARC
                    </Button>
                  </div>
                  
                  {sparcResult && (
                    <div className="mt-4">
                      <label className="text-sm font-medium">SPARC Result:</label>
                      <Textarea
                        value={sparcResult}
                        readOnly
                        rows={8}
                        className="mt-2 font-mono text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hive-Mind Tab */}
            <TabsContent value="hivemind" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Hive-Mind Coordination (Schritt 329)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Target Agents (comma-separated)</label>
                    <Input
                      value={targetAgents}
                      onChange={(e) => setTargetAgents(e.target.value)}
                      placeholder="researcher,coder,architect"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Command Payload (JSON)</label>
                    <Textarea
                      value={hiveMindPayload}
                      onChange={(e) => setHiveMindPayload(e.target.value)}
                      placeholder='{"priority": "high", "context": "development"}'
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(['TaskDistribution', 'CollectiveDecision', 'KnowledgeSync', 'EmergentBehavior'] as HiveMindCommandType[]).map(type => (
                      <Button
                        key={type}
                        onClick={() => createHiveMindCommand(type)}
                        className="outline text-sm flex items-center gap-2"
                      >
                        <Users className="w-3 h-3" />
                        {type}
                      </Button>
                    ))}
                  </div>
                  
                  {hiveMindCommands.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Created Commands:</label>
                      {hiveMindCommands.map(command => (
                        <div key={command.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{command.command_type} - {command.target_agents.join(', ')}</span>
                          <Button
                            onClick={() => processHiveMindCommand(command)}
                            className="text-sm"
                            disabled={loading}
                          >
                            Process
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value="memory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Layer Persistence (Schritt 330)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Memory Key</label>
                      <Input
                        value={memoryKey}
                        onChange={(e) => setMemoryKey(e.target.value)}
                        placeholder="Enter memory key..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Memory Value</label>
                      <Input
                        value={memoryValue}
                        onChange={(e) => setMemoryValue(e.target.value)}
                        placeholder="Enter memory value..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={storeMemory}
                      disabled={loading || !memoryKey.trim() || !memoryValue.trim()}
                      className="flex items-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Store Memory
                    </Button>
                    
                    <Button
                      onClick={retrieveMemory}
                      disabled={loading || !memoryKey.trim()}
                      className="outline flex items-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Retrieve Memory
                    </Button>
                  </div>
                  
                  {retrievedValue && (
                    <div>
                      <label className="text-sm font-medium">Retrieved Value:</label>
                      <Input
                        value={retrievedValue}
                        readOnly
                        className="mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};