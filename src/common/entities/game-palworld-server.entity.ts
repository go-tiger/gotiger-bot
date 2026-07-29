import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { GameServer } from './game-server.entity';
import { encryptedColumn } from '../crypto/encrypted-column.transformer';

/**
 * 팰월드 게임서버의 접속 정보. game_servers 와 PK 를 공유한다.
 *
 * 모드(GTHttpBridge)의 Python 서버와 양방향으로 통신한다.
 * - 봇 → 모드: baseUrl 에 /donation 을 붙여 POST. botKey 는 원문이 필요해 암호화 저장.
 * - 모드 → 봇: serverKey 는 검증만 하면 되므로 해시로 저장한다.
 */
@Entity('game_palworld_servers')
export class GamePalworldServer {
  @PrimaryColumn({ type: 'int' })
  gameServerId: number;

  @OneToOne(() => GameServer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_server_id' })
  gameServer: GameServer;

  /** 모드 HTTP 서버 주소. 예: http://1.2.3.4:25576 */
  @Column({ type: 'varchar' })
  baseUrl: string;

  /** 봇 → 모드 요청의 X-API-Key. */
  @Column({ type: 'varchar', transformer: encryptedColumn })
  botKey: string;

  /** 모드 → 봇 요청의 X-Server-Key 해시. */
  @Column({ type: 'varchar' })
  serverKeyHash: string;

  /** 마지막 heartbeat 수신 시각. 만료 판정과 연결 상태 표시에 쓴다. */
  @Column({ type: 'timestamptz', nullable: true })
  lastHeartbeatAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
